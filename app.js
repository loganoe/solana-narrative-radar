const state = {
  snapshot: null,
  activeTab: 'narratives',
};

const $ = (selector) => document.querySelector(selector);

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'n/a';
  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(Number(value)) >= 1000000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(Number(value)) >= 1000 ? 1 : 2,
  }).format(Number(value));
};

const formatDate = (value) => {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const setText = (selector, text) => {
  const node = $(selector);
  if (node) node.textContent = text;
};

async function loadSnapshot() {
  const response = await fetch(`./data/snapshot.json?ts=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Snapshot request failed: ${response.status}`);
  return response.json();
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === tab);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('is-active', panel.id === tab);
  });
}

function renderOverview(snapshot) {
  setText('#lastRefresh', formatDate(snapshot.generatedAt));
  setText('#narrativeCount', snapshot.narratives.length.toString());
  setText('#tokenCount', snapshot.signals.tokens.length.toString());
  setText('#repoCount', snapshot.signals.repositories.length.toString());
  setText('#snapshotStatus', `Snapshot generated from ${snapshot.sources.length} sources.`);
}

function renderNarratives(snapshot) {
  const grid = $('#narrativeGrid');
  const template = $('#narrativeTemplate');
  grid.replaceChildren();

  snapshot.narratives.forEach((narrative, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.badge').textContent = `Rank ${index + 1}`;
    node.querySelector('.score').textContent = `${Math.round(narrative.score)} pts`;
    node.querySelector('h3').textContent = narrative.title;
    node.querySelector('.summary').textContent = narrative.summary;

    const evidence = node.querySelector('.evidence');
    narrative.evidence.slice(0, 3).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'evidence-item';
      const name = document.createElement('span');
      name.textContent = item.label;
      const score = document.createElement('strong');
      score.textContent = item.value;
      row.append(name, score);
      evidence.append(row);
    });
    grid.append(node);
  });
}

function renderIdeas(snapshot) {
  const list = $('#ideaList');
  list.replaceChildren();

  snapshot.narratives.flatMap((narrative) => narrative.ideas.map((idea) => ({ ...idea, narrative: narrative.title })))
    .slice(0, 12)
    .forEach((idea) => {
      const node = document.createElement('article');
      node.className = 'idea-item';
      node.innerHTML = `
        <h3></h3>
        <p></p>
        <div class="idea-meta">
          <span class="chip"></span>
          <span class="chip"></span>
        </div>
      `;
      node.querySelector('h3').textContent = idea.title;
      node.querySelector('p').textContent = idea.description;
      const chips = node.querySelectorAll('.chip');
      chips[0].textContent = idea.narrative;
      chips[1].textContent = idea.effort;
      list.append(node);
    });
}

function renderTokenSignals(tokens) {
  const table = $('#tokenTable');
  table.replaceChildren();
  tokens.slice(0, 18).forEach((token) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    const name = document.createElement('span');
    name.className = 'signal-name';
    name.innerHTML = `<span></span><small></small>`;
    name.querySelector('span').textContent = `${token.symbol || 'UNKNOWN'} - ${token.name || 'Unnamed token'}`;
    name.querySelector('small').textContent = token.bucket;
    const value = document.createElement('strong');
    value.textContent = `$${formatNumber(token.volume24h || token.liquidity || token.mcap || 0)}`;
    row.append(name, value);
    table.append(row);
  });
}

function renderRepoSignals(repositories) {
  const table = $('#repoTable');
  table.replaceChildren();
  repositories.slice(0, 18).forEach((repo) => {
    const row = document.createElement('a');
    row.className = 'table-row';
    row.href = repo.url;
    row.target = '_blank';
    row.rel = 'noreferrer';
    const name = document.createElement('span');
    name.className = 'signal-name';
    name.innerHTML = `<span></span><small></small>`;
    name.querySelector('span').textContent = repo.fullName;
    name.querySelector('small').textContent = repo.description || 'No description';
    const value = document.createElement('strong');
    value.textContent = `${formatNumber(repo.stars)} stars`;
    row.append(name, value);
    table.append(row);
  });
}

function renderMethod(snapshot) {
  const grid = $('#methodGrid');
  grid.replaceChildren();
  [
    {
      title: 'Data sources',
      body: snapshot.sources.map((source) => source.name).join(', '),
    },
    {
      title: 'Ranking',
      body: 'Scores combine token trend, liquidity, organic activity, verification, repository activity, freshness, and keyword matches.',
    },
    {
      title: 'Refresh cadence',
      body: 'The included GitHub Action regenerates the snapshot every two weeks and can be triggered manually.',
    },
  ].forEach((item) => {
    const node = document.createElement('article');
    node.className = 'method-item';
    const title = document.createElement('h3');
    title.textContent = item.title;
    const body = document.createElement('p');
    body.textContent = item.body;
    node.append(title, body);
    grid.append(node);
  });
}

function render(snapshot) {
  renderOverview(snapshot);
  renderNarratives(snapshot);
  renderIdeas(snapshot);
  renderTokenSignals(snapshot.signals.tokens);
  renderRepoSignals(snapshot.signals.repositories);
  renderMethod(snapshot);
}

async function init() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  $('#refreshButton').addEventListener('click', async () => {
    setText('#snapshotStatus', 'Refreshing bundled snapshot.');
    state.snapshot = await loadSnapshot();
    render(state.snapshot);
  });

  try {
    state.snapshot = await loadSnapshot();
    render(state.snapshot);
  } catch (error) {
    setText('#snapshotStatus', error.message);
  }
}

init();
