export interface AIResponse {
  text: string
  suggestions?: string[]
}

interface ToolContext {
  tool: string
  input: string
  extraData?: Record<string, string>
}

// ─── Real crypto helpers ───

async function shaHash(text: string, algo: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const buf = await crypto.subtle.digest(algo.toUpperCase(), data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function detectHashType(hash: string): string {
  if (/^[a-f0-9]{32}$/i.test(hash)) return 'md5'
  if (/^[a-f0-9]{40}$/i.test(hash)) return 'sha1'
  if (/^[a-f0-9]{64}$/i.test(hash)) return 'sha256'
  if (/^[a-f0-9]{128}$/i.test(hash)) return 'sha512'
  return 'unknown'
}

const COMMON_PASSWORDS = [
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567',
  'dragon', '123123', 'admin', 'letmein', 'welcome', 'monkey', 'login', 'abc123', 'starwars',
  'password1', 'password123', '000000', 'root', 'toor', 'pass', 'qwerty123', 'iloveyou',
  'trustno1', 'sunshine', 'princess', 'football', 'charlie', 'access', 'shadow', 'master',
  '654321', 'superman', 'michael', 'baseball', 'batman', 'test', 'guest', 'hello', 'secret',
  'demo', 'user', 'pass123', 'admin123', 'root123', 'test123', 'P@ssw0rd', 'Passw0rd',
  'Password1', 'Password123', 'Admin123', 'abc12345', '1q2w3e4r', 'asdfgh', 'zxcvbn',
  'hunter2', 'buster', 'soccer', 'hockey', 'jordan', 'thomas', 'matrix', 'mobile',
  'internet', 'security', 'computer', 'network', 'server', 'linux', 'windows',
]

async function crackHash(targetHash: string): Promise<{ found: boolean; password: string | null; algo: string }> {
  const algo = detectHashType(targetHash)
  if (algo === 'unknown') return { found: false, password: null, algo: 'unknown' }

  for (const pwd of COMMON_PASSWORDS) {
    const hashVal = await shaHash(pwd, algo)
    if (hashVal.toLowerCase() === targetHash.toLowerCase()) {
      return { found: true, password: pwd, algo }
    }
  }

  return { found: false, password: null, algo }
}

// ─── Real DNS lookup via DoH ───

async function dnsLookup(domain: string, type: string = 'A'): Promise<string> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: { 'Accept': 'application/dns-json' },
    })
    if (!res.ok) throw new Error(`DNS query failed: ${res.status}`)
    const data = await res.json()
    if (!data.Answer || data.Answer.length === 0) return `No ${type} records found for ${domain}`

    const lines = data.Answer.map((a: { type: number; name: string; TTL: number; data: string }) => {
      const typeMap: Record<number, string> = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 257: 'CAA' }
      return `${typeMap[a.type] || `TYPE${a.type}`}  ${a.name}  TTL:${a.TTL}  ${a.data}`
    })
    return `DNS Records for ${domain}:\n\n${lines.join('\n')}`
  } catch (e) {
    return `DNS lookup error: ${(e as Error).message}`
  }
}

// ─── Real IP geolocation ───

async function ipGeolocation(ip: string): Promise<string> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`)
    if (!res.ok) throw new Error(`Lookup failed: ${res.status}`)
    const data = await res.json()
    if (data.error) throw new Error(data.reason || 'Unknown error')
    return `IP Geolocation for ${ip}:

  City: ${data.city || 'N/A'}
  Region: ${data.region || 'N/A'}
  Country: ${data.country_name || 'N/A'} (${data.country || 'N/A'})
  ISP: ${data.org || 'N/A'}
  ASN: ${data.asn || 'N/A'}
  Latitude: ${data.latitude || 'N/A'}
  Longitude: ${data.longitude || 'N/A'}
  Timezone: ${data.timezone || 'N/A'}`
  } catch (e) {
    return `IP lookup error: ${(e as Error).message}`
  }
}

// ─── Command parser for AI chat ───

function parseCommand(input: string): { command: string; arg: string } | null {
  const lower = input.toLowerCase().trim()

  // hash <text>
  let m = lower.match(/^(?:hash|sha256|sha-256)\s+(.+)/)
  if (m) return { command: 'hash', arg: m[1] }

  // sha1 <text>
  m = lower.match(/^sha1\s+(.+)/)
  if (m) return { command: 'sha1', arg: m[1] }

  // sha512 <text>
  m = lower.match(/^sha512\s+(.+)/)
  if (m) return { command: 'sha512', arg: m[1] }

  // base64 encode/decode
  m = lower.match(/^(?:b64|base64)\s+(encode|decode)\s+(.+)/)
  if (m) return { command: 'base64', arg: `${m[1]}|${m[2]}` }

  // url encode/decode
  m = lower.match(/^url\s+(encode|decode)\s+(.+)/)
  if (m) return { command: 'url', arg: `${m[1]}|${m[2]}` }

  // hex encode/decode
  m = lower.match(/^hex\s+(encode|decode)\s+(.+)/)
  if (m) return { command: 'hex', arg: `${m[1]}|${m[2]}` }

  // crack <hash>
  m = lower.match(/^(?:crack|crackhash|decodehash|break)\s+([a-f0-9]{32,128})/i)
  if (m) return { command: 'crack', arg: m[1] }

  // dns <domain>
  m = lower.match(/^(?:dns|dnslookup|lookup)\s+([a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})/)
  if (m) return { command: 'dns', arg: m[1] }

  // ip / geolocation
  m = lower.match(/^(?:ip|geo|location|whereis)\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)
  if (m) return { command: 'ip', arg: m[1] }

  // analyze headers <url>
  m = lower.match(/^(?:analyze|scan|headers?)\s+(https?:\/\/[^\s]+)/i)
  if (m) return { command: 'analyze-headers', arg: m[1] }

  return null
}

// ─── Main response engine ───

const RESPONSES: Record<string, (ctx: ToolContext) => AIResponse | Promise<AIResponse>> = {
  'vuln-scanner': ({ input }) => {
    const checks: string[] = []
    if (/https?:\/\//.test(input) && !/https:\/\//.test(input)) checks.push('Insecure HTTP protocol detected')
    if (/password\s*=\s*['"].*['"]/i.test(input)) checks.push('Hardcoded credentials found')
    if (/eval\s*\(/i.test(input)) checks.push('eval() usage — potential XSS/code injection')
    if (/innerHTML\s*=/.test(input)) checks.push('innerHTML usage — XSS risk')
    if (/SELECT.*FROM.*\+/i.test(input)) checks.push('SQL string concatenation — injection risk')
    if (/access-control-allow-origin:\s*\*/i.test(input)) checks.push('Wildcard CORS policy')

    if (checks.length === 0) {
      return {
        text: `## Vulnerability Scan Complete\n\nNo common vulnerability patterns detected.\n\nNote: This is a pattern-based scan. For thorough testing, use OWASP ZAP, Burp Suite, or Nmap.\n\n### Recommendations\n- Perform manual code review\n- Use SAST/DAST tools for deeper analysis\n- Follow OWASP Testing Guide`,
        suggestions: ['Learn about OWASP Top 10', 'How to use SAST tools', 'Common web vulnerabilities'],
      }
    }

    return {
      text: `## Vulnerability Scan Results\n\nDetected ${checks.length} potential issue(s):\n\n${checks.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n### Next Steps\n- Review each finding manually\n- Prioritize by severity\n- Apply fixes and re-scan`,
      suggestions: ['How to fix XSS', 'How to fix SQL injection', 'Security hardening guide'],
    }
  },

  'password-tools': () => ({
    text: `## Password Security\n\nThe Password Tools provide:\n\n1. **Generator** — Creates cryptographically secure passwords using Web Crypto API\n2. **Strength Analyzer** — Evaluates password strength and estimates crack time\n\n### Best Practices\n- Use unique passwords for each account\n- Enable MFA wherever possible\n- Use a password manager\n- Never reuse passwords across services`,
    suggestions: ['How to set up MFA', 'Best password managers', 'Password policies'],
  }),

  'password-cracker': () => ({
    text: `## Password Cracker\n\nReal password cracking with three attack modes:\n\n1. **Dictionary Attack** — Tests against a list of 100+ common passwords\n2. **Brute Force** — Tries all character combinations up to a max length\n3. **Rainbow Table** — Pre-computes hashes for common passwords and looks up matches\n\n### Supported Hash Types\n- MD5 (32 hex chars)\n- SHA-1 (40 hex chars)\n- SHA-256 (64 hex chars)\n- SHA-512 (128 hex chars)\n- Plaintext\n\n### From Chat\nYou can also crack hashes directly here by typing:\n\`crack 5f4dcc3b5aa765d61d8327deb882cf99\``,
    suggestions: ['How does dictionary attack work', 'What is a rainbow table', 'Brute force vs dictionary'],
  }),

  'incident-tracker': () => ({
    text: `## Incident Response Tracker\n\nManage security incidents through their lifecycle:\n\n### Incident Lifecycle\n1. **Open** — Initial report\n2. **Investigating** — Active analysis\n3. **Contained** — Threat isolated\n4. **Resolved** — Incident closed\n\nAll incidents are saved to the database and persist across sessions.`,
    suggestions: ['Incident response plan', 'How to contain a breach', 'Forensics basics'],
  }),

  'network-monitor': () => ({
    text: `## Network Monitor\n\nLog and track network events to identify suspicious activity.\n\n### Features\n- Log source/destination IP, port, protocol\n- Mark events as allowed, blocked, or flagged\n- Set threat level\n- Filter by threat level\n- View statistics dashboard\n\nAll logs stored in Supabase.`,
    suggestions: ['How to detect network attacks', 'Network forensics guide', 'SIEM basics'],
  }),

  'threat-intel': () => ({
    text: `## Threat Intelligence\n\nCheck reputation of IPs, domains, URLs, and file hashes.\n\n### From Chat\n- \`ip 8.8.8.8\` — Get IP geolocation and ISP info\n- \`dns example.com\` — Query DNS records\n\n### Indicator Types\n- **IP Address** — Check for malicious activity\n- **Domain** — Check for phishing/malware\n- **File Hash** — Check against known malware\n\nFor deeper analysis, cross-reference with VirusTotal or AbuseIPDB.`,
    suggestions: ['How to use VirusTotal', 'What is OSINT', 'Threat hunting basics'],
  }),

  'firewall-builder': () => ({
    text: `## Firewall Rule Builder\n\nCreate and manage firewall rules with iptables export.\n\n### Best Practices\n1. Default deny — block everything, allow only what's needed\n2. Least privilege — restrict to specific IPs\n3. Log denied traffic\n4. Regularly review rules\n\nRules can be exported as iptables configuration.`,
    suggestions: ['iptables basics', 'Firewall best practices', 'Network segmentation'],
  }),

  'dns-lookup': () => ({
    text: `## DNS Lookup\n\nQuery DNS records using DNS-over-HTTPS (DoH).\n\n### From Chat\nType \`dns example.com\` to query A records directly.\n\n### Record Types\n- A, AAAA, MX, TXT, NS, CNAME, SRV, CAA\n\n### Providers\n- Cloudflare and Google DoH endpoints`,
    suggestions: ['How DNS works', 'DNS security', 'What is DNS-over-HTTPS'],
  }),

  'security-audit': () => ({
    text: `## Security Audit Checklists\n\nComprehensive checklists for systematic audits:\n\n1. **Network Security** — Firewalls, ports, segmentation\n2. **System Hardening** — OS, encryption, access\n3. **Web Application** — Headers, validation, sessions\n4. **Access Control** — Privileges, MFA, policies\n\nProgress is saved automatically.`,
    suggestions: ['SOC 2 compliance', 'ISO 27001 basics', 'Security hardening guide'],
  }),

  'header-analyzer': ({ input }) => {
    const headers: Record<string, string> = {}
    for (const line of input.split('\n')) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim()
    }
    const findings: string[] = []
    if (headers['strict-transport-security']) findings.push('HSTS is enabled')
    else findings.push('HSTS header is missing')
    if (headers['x-content-type-options']) findings.push('X-Content-Type-Options is set')
    else findings.push('X-Content-Type-Options is missing')
    if (headers['x-frame-options']) findings.push('X-Frame-Options is set')
    else findings.push('X-Frame-Options is missing')
    if (headers['content-security-policy']) findings.push('CSP is present')
    else findings.push('CSP is missing')
    const score = Math.max(0, 100 - findings.filter(f => f.includes('missing')).length * 15)
    return {
      text: `## Header Analysis\n\n**Security Score: ${score}/100**\n\n${findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
      suggestions: ['Learn about CSP', 'Security headers guide'],
    }
  },

  'encoder-decoder': ({ input, extraData }) => {
    const mode = extraData?.mode || 'encode'
    const format = extraData?.format || 'base64'
    try {
      if (mode === 'encode') {
        if (format === 'base64') return { text: `\`\`\`\n${btoa(input)}\n\`\`\``, suggestions: ['Decode'] }
        if (format === 'url') return { text: `\`\`\`\n${encodeURIComponent(input)}\n\`\`\``, suggestions: ['Decode'] }
        if (format === 'hex') return { text: `\`\`\`\n${Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')}\n\`\`\``, suggestions: ['Decode'] }
      } else {
        if (format === 'base64') return { text: `\`\`\`\n${atob(input)}\n\`\`\``, suggestions: ['Encode'] }
        if (format === 'url') return { text: `\`\`\`\n${decodeURIComponent(input)}\n\`\`\``, suggestions: ['Encode'] }
        if (format === 'hex') return { text: `\`\`\`\n${input.split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join('')}\n\`\`\``, suggestions: ['Encode'] }
      }
    } catch { return { text: `Error: Invalid input for ${format} ${mode}.`, suggestions: ['Try again'] } }
    return { text: 'Unknown format.', suggestions: [] }
  },

  'port-scanner': ({ input, extraData }) => {
    const ports = (extraData?.ports || '80,443,22,8080').split(',').map(p => parseInt(p.trim())).filter(Boolean)
    const services: Record<number, string> = { 21: 'FTP', 22: 'SSH', 80: 'HTTP', 443: 'HTTPS', 3306: 'MySQL', 8080: 'HTTP-Alt', 3000: 'Dev' }
    return { text: `## Port Scan: ${input}\n\n${ports.map(p => `Port ${p} (${services[p] || 'Unknown'}): ${Math.random() > 0.6 ? 'open' : 'closed'}`).join('\n')}\n\nSimulated. Use the Port Scanner tool for real scanning.`, suggestions: ['Open Port Scanner'] }
  },

  'hash-tools': async ({ input, extraData }) => {
    const algorithm = extraData?.algorithm || 'sha256'
    try {
      const hashHex = await shaHash(input, algorithm)
      return { text: `**${algorithm.toUpperCase()} Hash:**\n\n\`\`\`\n${hashHex}\n\`\`\``, suggestions: ['Copy hash', 'Hash another input'] }
    } catch (e) { return { text: `Error: ${(e as Error).message}`, suggestions: [] } }
  },

  'default': async (ctx) => {
    const input = ctx.input
    const lower = input.toLowerCase().trim()

    // ─── Real command execution ───
    const cmd = parseCommand(input)
    if (cmd) {
      switch (cmd.command) {
        case 'hash': {
          const hash = await shaHash(cmd.arg, 'sha256')
          return { text: `**SHA-256 Hash:**\n\n\`\`\`\n${hash}\n\`\`\``, suggestions: ['SHA-1 this', 'SHA-512 this', 'Base64 encode'] }
        }
        case 'sha1': {
          const hash = await shaHash(cmd.arg, 'sha1')
          return { text: `**SHA-1 Hash:**\n\n\`\`\`\n${hash}\n\`\`\``, suggestions: ['SHA-256 this', 'SHA-512 this'] }
        }
        case 'sha512': {
          const hash = await shaHash(cmd.arg, 'sha512')
          return { text: `**SHA-512 Hash:**\n\n\`\`\`\n${hash}\n\`\`\``, suggestions: ['SHA-256 this', 'SHA-1 this'] }
        }
        case 'base64': {
          const [mode, text] = cmd.arg.split('|')
          try {
            if (mode === 'encode') return { text: `**Base64 Encoded:**\n\n\`\`\`\n${btoa(text)}\n\`\`\``, suggestions: ['Decode', 'URL encode'] }
            return { text: `**Base64 Decoded:**\n\n\`\`\`\n${atob(text)}\n\`\`\``, suggestions: ['Encode', 'URL decode'] }
          } catch { return { text: `Error: Invalid Base64 input.`, suggestions: ['Try again'] } }
        }
        case 'url': {
          const [mode, text] = cmd.arg.split('|')
          if (mode === 'encode') return { text: `**URL Encoded:**\n\n\`\`\`\n${encodeURIComponent(text)}\n\`\`\``, suggestions: ['Decode', 'Base64 encode'] }
          return { text: `**URL Decoded:**\n\n\`\`\`\n${decodeURIComponent(text)}\n\`\`\``, suggestions: ['Encode', 'Base64 decode'] }
        }
        case 'hex': {
          const [mode, text] = cmd.arg.split('|')
          if (mode === 'encode') return { text: `**Hex Encoded:**\n\n\`\`\`\n${Array.from(text).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')}\n\`\`\``, suggestions: ['Decode', 'Base64 encode'] }
          return { text: `**Hex Decoded:**\n\n\`\`\`\n${text.split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join('')}\n\`\`\``, suggestions: ['Encode', 'Base64 decode'] }
        }
        case 'crack': {
          const result = await crackHash(cmd.arg)
          if (result.found) {
            return {
              text: `## PASSWORD CRACKED\n\n**Hash:** \`${cmd.arg}\`\n**Type:** ${result.algo.toUpperCase()}\n**Password:** \`${result.password}\`\n\nThe hash was cracked using a dictionary attack against common passwords.`,
              suggestions: ['Hash another password', 'Learn about hash types', 'Try brute force'],
            }
          }
          return {
            text: `## Password Not Found\n\n**Hash:** \`${cmd.arg}\`\n**Detected type:** ${result.algo === 'unknown' ? 'Unknown (not a valid hash format)' : result.algo.toUpperCase()}\n\nThe hash was not found in the common password dictionary. Try the Password Cracker tool with brute force mode for more thorough cracking.`,
            suggestions: ['Open Password Cracker', 'Learn about hash types', 'Try brute force'],
          }
        }
        case 'dns': {
          const result = await dnsLookup(cmd.arg, 'A')
          return { text: result, suggestions: ['Query MX records', 'Query TXT records', 'Query NS records'] }
        }
        case 'ip': {
          const result = await ipGeolocation(cmd.arg)
          return { text: result, suggestions: ['Check another IP', 'DNS lookup', 'Open Threat Intel'] }
        }
        case 'analyze-headers': {
          try {
            const res = await fetch(cmd.arg, { mode: 'no-cors' })
            const headers: Record<string, string> = {}
            res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })
            const findings: string[] = []
            if (headers['strict-transport-security']) findings.push('HSTS is enabled')
            else findings.push('HSTS is missing')
            if (headers['x-content-type-options']) findings.push('X-Content-Type-Options is set')
            else findings.push('X-Content-Type-Options is missing')
            if (headers['content-security-policy']) findings.push('CSP is present')
            else findings.push('CSP is missing')
            const score = Math.max(0, 100 - findings.filter(f => f.includes('missing')).length * 15)
            return {
              text: `## Header Analysis for ${cmd.arg}\n\n**Security Score: ${score}/100**\n\n${findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nNote: Browser CORS may limit visible headers. For full analysis, use the Header Analyzer tool.`,
              suggestions: ['Open Header Analyzer', 'Scan another URL', 'Learn about CSP'],
            }
          } catch (e) {
            return { text: `Error fetching headers: ${(e as Error).message}\n\nBrowser CORS may block cross-origin header access. Try the Header Analyzer tool with manual paste.`, suggestions: ['Open Header Analyzer'] }
          }
        }
      }
    }

    // ─── Knowledge base responses ───

    if (lower.includes('xss') || lower.includes('cross-site scripting')) {
      return {
        text: `## Cross-Site Scripting (XSS)\n\nXSS allows attackers to inject malicious scripts into web pages.\n\n### Types\n1. **Stored XSS** — Script stored on server\n2. **Reflected XSS** — Script reflected from URL\n3. **DOM-based XSS** — Script via DOM manipulation\n\n### Prevention\n- Input validation and sanitization\n- Content Security Policy (CSP)\n- Output encoding\n- Use frameworks with automatic escaping\n\n### Test from chat\n\`analyze https://example.com\` — Check security headers`,
        suggestions: ['How to prevent XSS', 'CSP configuration', 'Test a URL for XSS'],
      }
    }

    if (lower.includes('sql injection') || lower.includes('sqli')) {
      return {
        text: `## SQL Injection\n\nSQL Injection allows attackers to manipulate database queries.\n\n### Types\n1. **In-band** — Same channel for attack and results\n2. **Blind** — Infer from behavior\n3. **Out-of-band** — Different channel\n\n### Prevention\n- Use parameterized queries\n- Input validation\n- Least privilege database access\n- WAF deployment`,
        suggestions: ['SQLi examples', 'How to prevent SQLi', 'NoSQL injection'],
      }
    }

    if (lower.includes('csrf') || lower.includes('cross-site request forgery')) {
      return {
        text: `## CSRF\n\nCSRF forces authenticated users to execute unwanted actions.\n\n### Prevention\n- Anti-CSRF tokens\n- SameSite cookie attribute\n- Verify Referer/Origin headers\n- Re-authentication for sensitive operations`,
        suggestions: ['CSRF tokens', 'SameSite cookies', 'Learn about XSS'],
      }
    }

    if (lower.includes('firewall') || lower.includes('iptables')) {
      return {
        text: `## Firewall Configuration\n\n### Best Practices\n1. **Default Deny** — Block all, allow only needed\n2. **Least Privilege** — Restrict to specific IPs/ports\n3. **Log Denied Traffic** — For analysis\n4. **Regular Review** — Update rules\n\n### iptables Basics\n\`\`\`bash\niptables -A INPUT -p tcp --dport 22 -j ACCEPT\niptables -A INPUT -j DROP\n\`\`\`\n\nUse the Firewall Builder tool to create and export rules.`,
        suggestions: ['Open Firewall Builder', 'Network segmentation', 'iptables cheatsheet'],
      }
    }

    if (lower.includes('incident') || lower.includes('breach') || lower.includes('response')) {
      return {
        text: `## Incident Response\n\n### IR Lifecycle (NIST)\n1. **Preparation** — Policies, tools, training\n2. **Detection & Analysis** — Identify incidents\n3. **Containment** — Isolate the threat\n4. **Eradication** — Remove the threat\n5. **Recovery** — Restore systems\n6. **Lessons Learned** — Improve\n\nUse the Incident Tracker to manage incidents.`,
        suggestions: ['Open Incident Tracker', 'How to contain a breach', 'NIST IR framework'],
      }
    }

    if (lower.includes('dns')) {
      return {
        text: `## DNS Security\n\n### Key Concepts\n- DNS translates domains to IPs\n- DNS-over-HTTPS (DoH) encrypts queries\n- DNSSEC adds cryptographic verification\n\n### From Chat\nType \`dns example.com\` to query real DNS records.\n\n### Common Attacks\n- DNS spoofing/cache poisoning\n- DNS tunneling\n- DDoS via DNS amplification`,
        suggestions: ['Open DNS Lookup', 'How DNS works', 'DNSSEC explained'],
      }
    }

    if (lower.includes('threat') || lower.includes('reputation') || lower.includes('ioc')) {
      return {
        text: `## Threat Intelligence\n\n### Indicators of Compromise (IOCs)\n- IP addresses, domains, file hashes, URLs\n\n### From Chat\n- \`ip 8.8.8.8\` — Get geolocation\n- \`dns suspicious.com\` — Query DNS\n\n### Sources\n- VirusTotal, AbuseIPDB, MalwareBazaar, OSINT feeds\n\nUse the Threat Intelligence tool for full reputation checks.`,
        suggestions: ['Open Threat Intel', 'What is OSINT', 'Threat hunting'],
      }
    }

    if (lower.includes('password') || lower.includes('crack') || lower.includes('hash')) {
      return {
        text: `## Password & Hash Tools\n\n### From Chat\n- \`hash hello\` — SHA-256 hash\n- \`sha1 hello\` — SHA-1 hash\n- \`sha512 hello\` — SHA-512 hash\n- \`crack 5f4dcc3b5aa765d61d8327deb882cf99\` — Crack MD5 hash\n- \`base64 encode hello\` — Base64 encode\n- \`base64 decode aGVsbG8=\` — Base64 decode\n\n### Tools\n- **Password Tools** — Generate & analyze passwords\n- **Password Cracker** — Dictionary, brute force, rainbow table\n- **Hash Tools** — Generate SHA hashes`,
        suggestions: ['Open Password Cracker', 'Open Hash Tools', 'Open Password Tools'],
      }
    }

    if (lower.includes('audit') || lower.includes('compliance') || lower.includes('checklist')) {
      return {
        text: `## Security Audits\n\n### Audit Types\n1. **Network Audit** — Firewalls, ports, segmentation\n2. **System Hardening** — OS, encryption, access\n3. **Web Application** — Headers, validation, sessions\n4. **Access Control** — Privileges, MFA, policies\n\n### Frameworks\n- SOC 2, ISO 27001, PCI DSS, HIPAA\n\nUse the Security Audit tool for checklists.`,
        suggestions: ['Open Security Audit', 'SOC 2 overview', 'ISO 27001 basics'],
      }
    }

    if (lower.includes('vulnerability') || lower.includes('vuln') || lower.includes('scan')) {
      return {
        text: `## Vulnerability Scanning\n\n### From Chat\n\`analyze https://example.com\` — Fetch and analyze security headers\n\n### Scan Types\n1. **Network Scan** — Open ports, services\n2. **Web Scan** — XSS, SQLi, headers\n3. **Code Scan** — Static analysis (SAST)\n4. **Config Scan** — Misconfigurations\n\n### Tools\n- Nmap, OWASP ZAP, Burp Suite, Nikto\n\nUse the Vulnerability Scanner tool for pattern-based checks.`,
        suggestions: ['Open Vulnerability Scanner', 'OWASP Top 10', 'How to use Nmap'],
      }
    }

    if (lower.includes('network') || lower.includes('monitor') || lower.includes('recon')) {
      return {
        text: `## Network Monitoring\n\n### From Chat\n- \`dns example.com\` — Query DNS records\n- \`ip 8.8.8.8\` — IP geolocation\n\n### Techniques\n- Port scanning (use Port Scanner tool)\n- Packet capture (Wireshark)\n- Flow analysis (NetFlow)\n- IDS/IPS (Suricata, Snort)\n\nUse the Network Monitor tool to log and track events.`,
        suggestions: ['Open Network Monitor', 'Open Port Scanner', 'Wireshark basics'],
      }
    }

    if (lower.includes('encode') || lower.includes('decode') || lower.includes('base64') || lower.includes('url') || lower.includes('hex')) {
      return {
        text: `## Encoding & Decoding\n\n### From Chat\n- \`base64 encode hello\` — Encode to Base64\n- \`base64 decode aGVsbG8=\` — Decode from Base64\n- \`url encode hello world\` — URL encode\n- \`url decode hello%20world\` — URL decode\n- \`hex encode hello\` — Hex encode\n- \`hex decode 68 65 6c 6c 6f\` — Hex decode\n\nUse the Encoder/Decoder tool for a full UI.`,
        suggestions: ['Open Encoder/Decoder', 'Encode something', 'Decode something'],
      }
    }

    // ─── Help / default ───

    return {
      text: `I'm your cybersecurity assistant. I can **execute real operations** from chat:\n\n### Commands\n- \`hash <text>\` — SHA-256 hash\n- \`sha1 <text>\` — SHA-1 hash\n- \`sha512 <text>\` — SHA-512 hash\n- \`crack <hash>\` — Crack MD5/SHA1/SHA256/SHA512 hash\n- \`base64 encode <text>\` — Base64 encode\n- \`base64 decode <text>\` — Base64 decode\n- \`url encode <text>\` — URL encode\n- \`url decode <text>\` — URL decode\n- \`hex encode <text>\` — Hex encode\n- \`hex decode <text>\` — Hex decode\n- \`dns <domain>\` — Real DNS lookup (DoH)\n- \`ip <address>\` — Real IP geolocation\n- \`analyze <url>\` — Fetch & analyze security headers\n\n### Topics\nAsk about XSS, SQL Injection, CSRF, firewalls, incidents, DNS, threat intel, passwords, audits, and more.`,
      suggestions: ['crack 5f4dcc3b5aa765d61d8327deb882cf99', 'hash hello world', 'dns example.com', 'ip 8.8.8.8'],
    }
  },
}

export async function getAIResponse(ctx: ToolContext): Promise<AIResponse> {
  const handler = RESPONSES[ctx.tool] || RESPONSES['default']
  const result = handler(ctx)
  if (result instanceof Promise) return await result
  return result
}

export const QUICK_PROMPTS = [
  'crack 5f4dcc3b5aa765d61d8327deb882cf99',
  'hash hello world',
  'dns example.com',
  'ip 8.8.8.8',
  'base64 encode secret data',
  'analyze https://example.com',
  'What is XSS?',
  'Explain SQL Injection',
  'How does CSRF work?',
  'Best practices for password security',
  'What is a zero-day vulnerability?',
  'Explain the OWASP Top 10',
]
