export const scanCodeSecurity = (code = "") => {
  if (!code) return [];

  const rules = [
    {
      pattern: /password|secret|api_key|token|atob|btoa/gi,
      patternString: "password|secret|api_key|token|atob|btoa",
      level: "Critical",
      label: "Sensitive Data",
      message: "Raw passwords, API keys, or risky Base64 token handling were detected in the code.",
    },
    {
      pattern: /sudo|rm\s+-rf|chmod\s+777/gi,
      patternString: "sudo|rm\\s+-rf|chmod\\s+777",
      level: "High",
      label: "System Command",
      message: "Administrator privilege usage or destructive file permission commands were detected.",
    },
    {
      pattern: /eval\(|exec\(|Function\(/g,
      patternString: "eval\\(|exec\\(|Function\\(",
      level: "Critical",
      label: "Code Injection",
      message: "Dynamic execution functions such as eval or exec can create serious security vulnerabilities.",
    },
    {
      pattern: /<script|innerHTML|document\.write/gi,
      patternString: "<script|innerHTML|document\\.write",
      level: "High",
      label: "XSS Risk",
      message: "Direct DOM manipulation or script injection patterns that may lead to XSS were detected.",
    },
    {
      pattern: /http:\/\/|ftp:\/\//gi,
      patternString: "http:\\/\\/|ftp:\\/\\/",
      level: "Medium",
      label: "Insecure Protocol",
      message: "Unencrypted HTTP or FTP usage was detected. Prefer HTTPS whenever possible.",
    },
  ];

  const detectedRisks = [];

  rules.forEach((rule) => {
    const regex = new RegExp(rule.pattern);
    if (regex.test(code)) {
      detectedRisks.push({
        level: rule.level,
        label: rule.label,
        message: rule.message,
        patternString: rule.patternString,
      });
    }
  });

  return detectedRisks;
};
