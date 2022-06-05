export function matchTypeDetailFromVarTag(docLine: string, variable?: string) {
  let matchTypeDetail: { value: string; trimedInput: string; pattern: string } | null = null;

  const patterns = [
    // @var array<int, string> $sample comment... comment
    `@var\\s+([\\w|<,\\-\\s\\\\]+[>]+)\\s+(\\\$${variable})\\s+.*$`,
    // @var int $sample comment... comment
    `@var\\s+(\\S+)\\s+(\\\$${variable})\\s+.*$`,
    // @var array<int, string> $sample
    `@var\\s+([\\w|<,\\-\\s\\\\]+[>]+)\\s+(\\\$${variable})$`,
    // @var int $sample
    `@var\\s+(\\S+)\\s+(\\\$${variable})$`,
    // @var array<int, string>
    `@var\\s+([\\w|<,\\-\\s\\\\]+[>]+)$`,
    // @var int
    `@var\\s+(\\S+)$`,
  ];

  if (docLine.includes('@var')) {
    for (const p of patterns) {
      const trimDocLine = docLine.trim();
      const reg = new RegExp(p);
      const m = reg.exec(trimDocLine);
      if (m) {
        matchTypeDetail = {
          value: m[1],
          trimedInput: m.input,
          pattern: p,
        };
        break;
      }
    }
  }

  return matchTypeDetail;
}

// ...and more
