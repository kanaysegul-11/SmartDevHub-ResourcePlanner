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

const collectHighlightRanges = (line = "", risks = []) => {
  const ranges = [];

  risks.forEach((risk) => {
    if (!risk?.patternString) return;

    const regex = new RegExp(risk.patternString, "gi");
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (!match[0]) {
        regex.lastIndex += 1;
        continue;
      }

      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  });

  return ranges
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .reduce((merged, current) => {
      const previous = merged[merged.length - 1];

      if (!previous || current.start > previous.end) {
        merged.push(current);
        return merged;
      }

      previous.end = Math.max(previous.end, current.end);
      return merged;
    }, []);
};

export const renderHighlightedCodeLines = (
  code = "",
  risks = [],
  highlightClassName = ""
) => {
  if (!code) return "";
  if (!risks.length) return code;

  return code.split("\n").map((line, lineIndex) => {
    const ranges = collectHighlightRanges(line, risks);

    if (!ranges.length) {
      return <div key={`line-${lineIndex}`}>{line || " "}</div>;
    }

    const parts = [];
    let cursor = 0;

    ranges.forEach((range, rangeIndex) => {
      if (range.start > cursor) {
        parts.push(
          <span key={`text-${lineIndex}-${rangeIndex}`}>
            {line.slice(cursor, range.start)}
          </span>
        );
      }

      parts.push(
        <span
          key={`highlight-${lineIndex}-${rangeIndex}`}
          className={highlightClassName}
        >
          {line.slice(range.start, range.end)}
        </span>
      );

      cursor = range.end;
    });

    if (cursor < line.length) {
      parts.push(
        <span key={`tail-${lineIndex}`}>{line.slice(cursor)}</span>
      );
    }

    if (!parts.length) {
      parts.push(<span key={`empty-${lineIndex}`}> </span>);
    }

    return <div key={`line-${lineIndex}`}>{parts}</div>;
  });
};
