import { mkdir, writeFile } from 'node:fs/promises';

const JUPITER_BASE = 'https://lite-api.jup.ag/tokens/v2';
const GITHUB_BASE = 'https://api.github.com/search/repositories';

const now = new Date();
const since = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const narrativeDefs = [
  {
    id: 'rwa-equities',
    title: 'Tokenized equities and RWA rails',
    keywords: ['xstock', 'stock', 'equity', 'treasury', 'rwa', 'backed', 'yield-bearing', 'asset'],
    summary: 'Real-world asset tokens and equity wrappers are showing enough liquidity and holder activity to justify compliance-aware portfolio tooling.',
    ideas: [
      {
        title: 'RWA allocation guardrail widget',
        description: 'A Solana wallet plugin that flags concentration, liquidity depth, and issuer exposure before a user swaps into tokenized equities.',
        effort: 'Medium',
      },
      {
        title: 'Equity token tax-lot exporter',
        description: 'A Jupiter-aware exporter that reconciles tokenized equity swaps with cost basis lots for accountant review.',
        effort: 'Small',
      },
    ],
  },
  {
    id: 'defi-automation',
    title: 'DeFi automation and execution quality',
    keywords: ['jupiter', 'swap', 'lend', 'perp', 'dca', 'order', 'vault', 'kamino', 'liquidity', 'router', 'yield'],
    summary: 'Trading, lending, and routed execution keep producing high-signal activity, suggesting room for tools that compare routes and automate intent.',
    ideas: [
      {
        title: 'Intent replay simulator',
        description: 'A dashboard that replays the same swap intent across Jupiter route choices and reports landing quality, slippage, and failed execution risk.',
        effort: 'Medium',
      },
      {
        title: 'Yield route tripwire',
        description: 'A monitor that watches liquidity and borrow-rate changes, then suggests when a position should migrate or reduce leverage.',
        effort: 'Medium',
      },
    ],
  },
  {
    id: 'agent-compute',
    title: 'AI agents and compute-native apps',
    keywords: ['ai', 'agent', 'llm', 'compute', 'inference', 'model', 'autonomous', 'bot', 'gpu'],
    summary: 'Agent and AI vocabulary appears across developer activity, creating space for verifiable agent workflows that can hold or settle value on Solana.',
    ideas: [
      {
        title: 'Agent escrow receipts',
        description: 'A tiny protocol that lets autonomous agents attach signed work receipts to escrow releases for paid tasks.',
        effort: 'Medium',
      },
      {
        title: 'Compute spend ledger',
        description: 'A Solana-indexed ledger for agents to track GPU spend, revenue, and wallet balances from one reproducible audit trail.',
        effort: 'Small',
      },
    ],
  },
  {
    id: 'dev-infrastructure',
    title: 'Developer infrastructure and verification',
    keywords: ['sdk', 'rpc', 'indexer', 'anchor', 'tool', 'cli', 'api', 'program', 'rust', 'verifier', 'validator'],
    summary: 'Recently updated Solana repositories still skew toward infrastructure, SDKs, and verification tools, which creates demand for debugging and observability layers.',
    ideas: [
      {
        title: 'Anchor account diff runner',
        description: 'A local CLI that snapshots account state before and after a transaction test, then prints invariant-focused diffs.',
        effort: 'Small',
      },
      {
        title: 'RPC health contract tester',
        description: 'A scheduled probe that compares public RPC responses for consistency and exposes provider regressions before an app ships.',
        effort: 'Small',
      },
    ],
  },
  {
    id: 'consumer-wallets',
    title: 'Consumer wallets and payments',
    keywords: ['wallet', 'mobile', 'pay', 'payment', 'consumer', 'social', 'chat', 'nfc', 'card'],
    summary: 'Wallet, mobile, and payment terminology remains a recurring build pattern, making user-facing transaction safety and onboarding valuable.',
    ideas: [
      {
        title: 'Human-readable payment memo layer',
        description: 'A lightweight payment request format that shows verified merchant metadata, token risk, and swap route before signing.',
        effort: 'Medium',
      },
      {
        title: 'Shared wallet activity digest',
        description: 'A privacy-preserving family or team digest that summarizes Solana wallet activity without exposing private keys or seed phrases.',
        effort: 'Small',
      },
    ],
  },
  {
    id: 'new-token-risk',
    title: 'New-token discovery and risk filtering',
    keywords: ['meme', 'pump', 'token', 'launch', 'mint', 'metadata', 'risk', 'audit', 'holder'],
    summary: 'Fresh token creation is noisy, but the combination of holder growth, liquidity, and verification gaps can be shaped into safer discovery products.',
    ideas: [
      {
        title: 'Fresh-pool risk triage',
        description: 'A ranking tool that labels new pools by liquidity, holder concentration, mint authority, freeze authority, and organic buyer count.',
        effort: 'Small',
      },
      {
        title: 'Token provenance timeline',
        description: 'A page that turns mint metadata, first pool creation, and authority changes into a readable timeline for wallets and communities.',
        effort: 'Small',
      },
    ],
  },
];

const sourceDefinitions = [
  {
    name: 'Jupiter Tokens API toptrending/24h',
    url: `${JUPITER_BASE}/toptrending/24h?limit=50`,
  },
  {
    name: 'Jupiter Tokens API toptraded/24h',
    url: `${JUPITER_BASE}/toptraded/24h?limit=50`,
  },
  {
    name: 'Jupiter Tokens API toporganicscore/24h',
    url: `${JUPITER_BASE}/toporganicscore/24h?limit=50`,
  },
  {
    name: 'Jupiter Tokens API recent',
    url: `${JUPITER_BASE}/recent`,
  },
  {
    name: 'GitHub repository search',
    url: 'https://api.github.com/search/repositories',
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'user-agent': 'solana-narrative-radar',
        accept: 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 240)}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJupiterSignals() {
  const buckets = [
    ['Trending 24h', `${JUPITER_BASE}/toptrending/24h?limit=50`],
    ['Traded 24h', `${JUPITER_BASE}/toptraded/24h?limit=50`],
    ['Organic 24h', `${JUPITER_BASE}/toporganicscore/24h?limit=50`],
    ['Recent pools', `${JUPITER_BASE}/recent`],
  ];

  const byId = new Map();
  for (const [bucket, url] of buckets) {
    const tokens = await fetchJson(url);
    tokens.slice(0, 50).forEach((token, index) => {
      const stats24h = token.stats24h || {};
      const existing = byId.get(token.id) || {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        icon: token.icon,
        tags: token.tags || [],
        isVerified: Boolean(token.isVerified),
        organicScore: Number(token.organicScore || 0),
        organicScoreLabel: token.organicScoreLabel || 'unknown',
        mcap: Number(token.mcap || 0),
        liquidity: Number(token.liquidity || 0),
        holderCount: Number(token.holderCount || 0),
        volume24h: 0,
        priceChange24h: Number(stats24h.priceChange || 0),
        firstPool: token.firstPool,
        createdAt: token.createdAt,
        buckets: [],
        rankScore: 0,
      };
      existing.volume24h = Math.max(
        existing.volume24h,
        Number(stats24h.buyVolume || 0) + Number(stats24h.sellVolume || 0)
      );
      existing.rankScore += 55 - index;
      existing.buckets.push(bucket);
      byId.set(token.id, existing);
    });
    await sleep(250);
  }

  return [...byId.values()].map((token) => ({
    ...token,
    bucket: [...new Set(token.buckets)].join(', '),
    signalText: `${token.name || ''} ${token.symbol || ''} ${(token.tags || []).join(' ')} ${token.bucket}`.toLowerCase(),
    score: token.rankScore
      + Math.min(25, Math.log10(token.volume24h + 1) * 4)
      + Math.min(20, Math.log10(token.liquidity + 1) * 3)
      + (token.isVerified ? 12 : 0)
      + Math.min(12, token.organicScore / 10),
  })).sort((a, b) => b.score - a.score);
}

async function fetchGithubSignals() {
  const queries = [
    `solana pushed:>${since} stars:>20`,
    `solana agent pushed:>${since}`,
    `solana wallet pushed:>${since}`,
    `solana anchor rust pushed:>${since}`,
    `jupiter solana pushed:>${since}`,
  ];

  const repos = new Map();
  for (const query of queries) {
    const url = `${GITHUB_BASE}?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=20`;
    const data = await fetchJson(url);
    for (const repo of data.items || []) {
      const existing = repos.get(repo.full_name) || {
        id: repo.id,
        fullName: repo.full_name,
        description: repo.description || '',
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics || [],
        updatedAt: repo.updated_at,
        queryHits: [],
      };
      existing.queryHits.push(query);
      repos.set(repo.full_name, existing);
    }
    await sleep(1200);
  }

  return [...repos.values()].map((repo) => {
    const ageDays = Math.max(0, (now - new Date(repo.updatedAt)) / (24 * 60 * 60 * 1000));
    const freshness = Math.max(0, 30 - ageDays);
    return {
      ...repo,
      signalText: `${repo.fullName} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${repo.language || ''}`.toLowerCase(),
      score: Math.log10(repo.stars + 1) * 12 + Math.log10(repo.forks + 1) * 5 + freshness + repo.queryHits.length * 8,
    };
  }).sort((a, b) => b.score - a.score).slice(0, 60);
}

function keywordMatches(signalText, keywords) {
  return keywords.filter((keyword) => signalText.includes(keyword));
}

function evidenceForToken(token) {
  const value = token.volume24h > 0
    ? `$${compact(token.volume24h)} vol`
    : `$${compact(token.liquidity)} liq`;
  return {
    type: 'token',
    label: `${token.symbol || 'UNKNOWN'} (${token.bucket.split(', ')[0]})`,
    value,
    score: token.score,
  };
}

function evidenceForRepo(repo) {
  return {
    type: 'repository',
    label: repo.fullName,
    value: `${compact(repo.stars)} stars`,
    score: repo.score,
  };
}

function compact(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function buildNarratives(tokens, repositories) {
  const narratives = narrativeDefs.map((def) => {
    const tokenHits = tokens
      .map((token) => ({ token, matches: keywordMatches(token.signalText, def.keywords) }))
      .filter((hit) => hit.matches.length > 0)
      .slice(0, 8);

    const repoHits = repositories
      .map((repo) => ({ repo, matches: keywordMatches(repo.signalText, def.keywords) }))
      .filter((hit) => hit.matches.length > 0)
      .slice(0, 8);

    const tokenScore = tokenHits.reduce((sum, hit) => sum + hit.token.score * (1 + hit.matches.length * 0.18), 0);
    const repoScore = repoHits.reduce((sum, hit) => sum + hit.repo.score * (1 + hit.matches.length * 0.16), 0);
    const breadth = Math.min(25, (tokenHits.length + repoHits.length) * 3);
    const score = tokenScore * 0.48 + repoScore * 0.72 + breadth;
    const evidence = [
      ...tokenHits.map((hit) => evidenceForToken(hit.token)),
      ...repoHits.map((hit) => evidenceForRepo(hit.repo)),
    ].sort((a, b) => b.score - a.score).slice(0, 5);

    return {
      id: def.id,
      title: def.title,
      summary: def.summary,
      score,
      evidence,
      ideas: def.ideas,
      keywords: def.keywords,
    };
  }).sort((a, b) => b.score - a.score);

  const fallbackEvidence = [
    ...tokens.slice(0, 3).map(evidenceForToken),
    ...repositories.slice(0, 2).map(evidenceForRepo),
  ];

  return narratives.map((narrative) => ({
    ...narrative,
    evidence: narrative.evidence.length ? narrative.evidence : fallbackEvidence,
  })).slice(0, 6);
}

async function main() {
  await mkdir('data', { recursive: true });
  const [tokens, repositories] = await Promise.all([
    fetchJupiterSignals(),
    fetchGithubSignals(),
  ]);
  const narratives = buildNarratives(tokens, repositories);

  const snapshot = {
    generatedAt: now.toISOString(),
    refreshWindow: {
      githubPushedSince: since,
      intendedCadence: 'fortnightly',
    },
    sources: sourceDefinitions,
    narratives,
    signals: {
      tokens: tokens.slice(0, 80),
      repositories,
    },
  };

  await writeFile('data/snapshot.json', `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote data/snapshot.json with ${narratives.length} narratives, ${tokens.length} token signals, ${repositories.length} repositories.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
