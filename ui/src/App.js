import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axios from 'axios';
import './App.css';

const TYPE_COLORS = {
  Person:      '#ff2244',
  Topic:       '#00e5ff',
  Artifact:    '#b400ff',
  Decision:    '#ffe100',
  Bug:         '#ff6b00',
  Developer:   '#00ff9d',
  Feature:     '#00b4ff',
  Issue:       '#ff9500',
  Repository:  '#00ffcc',
  Technology:  '#c8ff00',
  Unknown:     '#3a5570',
};

const TYPE_ICONS = {
  Person:      '👤',
  Topic:       '💡',
  Artifact:    '📦',
  Decision:    '⚖️',
  Bug:         '🐛',
  Developer:   '👨‍💻',
  Feature:     '✨',
  Issue:       '📋',
  Repository:  '📁',
  Technology:  '⚙️',
  Unknown:     '❓',
};

function getNodeColor(node) {
  return TYPE_COLORS[node.type] || TYPE_COLORS.Unknown;
}

/* ── Expander component ──────────────────────────── */
function Expander({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="expander">
      <div className="expander-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className={`expander-chevron ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && <div className="expander-body">{children}</div>}
    </div>
  );
}

/* ── Bar chart ───────────────────────────────────── */
function BarChart({ data, color = '#00e5ff' }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div style={{ marginTop: 10 }}>
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="bar-row">
          <span className="bar-key" title={key}>{key}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(val / max) * 100}%`, background: color }}
            />
          </div>
          <span className="bar-count">{val}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main App ────────────────────────────────────── */
export default function App() {
  const [graphData, setGraphData]       = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [search, setSearch]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab]       = useState('graph');

  // Sidebar filter states
  const [allTypes, setAllTypes]         = useState([]);
  const [allRels, setAllRels]           = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedRels, setSelectedRels]   = useState([]);
  const [minDegree, setMinDegree]       = useState(0);
  const [maxNodes, setMaxNodes]         = useState(200);
  const [searchFilter, setSearchFilter] = useState('');
  const [physicsOn, setPhysicsOn]       = useState(true);
  const [gravity, setGravity]           = useState(-200);

  // Node explorer
  const [selectedNode, setSelectedNode] = useState(null);

  const fgRef = useRef();

  /* ── Fetch graph ─────────────────────────────── */
  useEffect(() => {
    axios.get('https://Vedanshipanda-layer10-api.hf.space/graph')
      .then(res => {
        if (res.data && res.data.nodes) {
          const nodes = res.data.nodes;

          // networkx node_link format uses integer indices for source/target
          // Build an index -> id map to resolve them
          const indexToId = {};
          nodes.forEach((n, i) => {
            indexToId[i] = n.id;
            indexToId[n.id] = n.id; // also allow string IDs passthrough
          });

          const links = (res.data.links || res.data.edges || []).map(l => {
            let src = typeof l.source === 'object' ? l.source.id : l.source;
            let tgt = typeof l.target === 'object' ? l.target.id : l.target;
            // Resolve integer indices to actual node IDs
            if (typeof src === 'number') src = indexToId[src] ?? src;
            if (typeof tgt === 'number') tgt = indexToId[tgt] ?? tgt;
            return { ...l, source: src, target: tgt };
          });

          const data = { nodes, links };
          setGraphData(data);

          // Derive types and rels - leave selected empty = show all
          const types = [...new Set(data.nodes.map(n => n.type || 'Unknown'))].sort();
          const rels   = [...new Set(data.links.map(l => l.relationship || l.relation || l.type || '?'))].sort();
          setAllTypes(types);
          setAllRels(rels);
          // Empty selectedTypes/selectedRels means "all selected" - no need to set them
        }
      })
      .catch(err => console.error('API Error:', err));
  }, []);

  /* ── Build filtered subgraph ─────────────────── */
  useEffect(() => {
    if (!graphData) return;

    // Build degree map (count both ends of every link)
    const degMap = {};
    graphData.nodes.forEach(n => { degMap[n.id] = 0; });
    graphData.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degMap[s] = (degMap[s] || 0) + 1;
      degMap[t] = (degMap[t] || 0) + 1;
    });

    // Empty selectedTypes = show everything; otherwise filter by selection
    const activeTypes = selectedTypes.length > 0 ? new Set(selectedTypes) : null;

    let nodes = graphData.nodes.filter(n =>
      (!activeTypes || activeTypes.has(n.type || 'Unknown')) &&
      (degMap[n.id] || 0) >= minDegree &&
      (!searchFilter || (n.id + '').toLowerCase().includes(searchFilter.toLowerCase()))
    );
    nodes = nodes
      .sort((a, b) => (degMap[b.id] || 0) - (degMap[a.id] || 0))
      .slice(0, maxNodes);

    const nodeSet = new Set(nodes.map(n => n.id));

    // If no rel filter is active, include ALL links between visible nodes
    const relFilter = selectedRels.length > 0 ? selectedRels : null;
    const links = graphData.links.filter(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (!nodeSet.has(s) || !nodeSet.has(t)) return false;
      if (relFilter === null) return true;
      return relFilter.includes(l.relationship || '?');
    });

    setFilteredData({ nodes, links });
  }, [graphData, selectedTypes, selectedRels, minDegree, maxNodes, searchFilter]);

  /* ── Query handler (unchanged logic) ─────────── */
  const handleSearch = async () => {
    try {
      const res = await axios.get(`https://Vedanshipanda-layer10-api.hf.space/retrieve?query=${search}`);
      const pack = res.data.context_pack || [];
      setSearchResults(pack);

      if (pack.length > 0 && fgRef.current && graphData) {
        const node = graphData.nodes.find(n => n.id === pack[0].entity);
        if (node) {
          fgRef.current.centerAt(node.x, node.y, 800);
          fgRef.current.zoom(4, 800);
        }
      }
    } catch (e) { console.error('Search error', e); }
  };

  /* ── Analytics derived data ──────────────────── */
  const typeCounts = {};
  const relCounts  = {};
  const degreeRows = [];

  if (graphData) {
    const degMap = {};
    graphData.nodes.forEach(n => { degMap[n.id] = 0; });
    graphData.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degMap[s] = (degMap[s] || 0) + 1;
      degMap[t] = (degMap[t] || 0) + 1;
    });
    const inDeg = {}, outDeg = {};
    graphData.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      outDeg[s] = (outDeg[s] || 0) + 1;
      inDeg[t]  = (inDeg[t]  || 0) + 1;
    });
    graphData.nodes.forEach(n => {
      const t = n.type || 'Unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    graphData.links.forEach(l => {
      const r = l.relationship || '?';
      relCounts[r] = (relCounts[r] || 0) + 1;
    });
    const top15 = Object.entries(degMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    top15.forEach(([id, deg]) => {
      const node = graphData.nodes.find(n => n.id === id);
      degreeRows.push({
        name: id,
        type: node?.type || 'Unknown',
        total: deg,
        in: inDeg[id] || 0,
        out: outDeg[id] || 0,
      });
    });
  }

  const topRels = Object.fromEntries(
    Object.entries(relCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  );

  /* ── Node explorer ───────────────────────────── */
  const nodeForExplorer = graphData?.nodes.find(n => n.id === selectedNode);
  const nodeColor       = TYPE_COLORS[nodeForExplorer?.type] || TYPE_COLORS.Unknown;

  const inEdges  = graphData?.links.filter(l => {
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    return t === selectedNode;
  }) || [];
  const outEdges = graphData?.links.filter(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    return s === selectedNode;
  }) || [];

  /* ── Canvas node drawing ─────────────────────── */
  const paintNode = useCallback((node, ctx, globalScale) => {
    const color = getNodeColor(node);
    const r = 6;

    // Outer glow ring
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
    ctx.fillStyle = color + '18';
    ctx.fill();

    // Mid glow
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI);
    ctx.fillStyle = color + '30';
    ctx.fill();

    // Core fill
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color + '55';
    ctx.fill();

    // Bright border
    ctx.shadowBlur = 14;
    ctx.shadowColor = color;
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner highlight dot
    ctx.beginPath();
    ctx.arc(node.x - r * 0.25, node.y - r * 0.25, r * 0.25, 0, 2 * Math.PI);
    ctx.fillStyle = color + 'cc';
    ctx.fill();

    // Label — always show, size based on zoom
    const label = String(node.id);
    const fs = Math.max(8, Math.min(11, 10 / globalScale));
    ctx.font = `600 ${fs}px 'Share Tech Mono', monospace`;
    ctx.textAlign = 'center';
    // Dark background for readability
    const textWidth = ctx.measureText(label.length > 18 ? label.slice(0,17)+'…' : label).width;
    ctx.fillStyle = 'rgba(2,4,8,0.75)';
    ctx.fillRect(node.x - textWidth/2 - 2, node.y + r + 2, textWidth + 4, fs + 3);
    // Label text
    ctx.fillStyle = color;
    ctx.shadowBlur = 4;
    ctx.shadowColor = color;
    ctx.fillText(label.length > 18 ? label.slice(0,17)+'…' : label, node.x, node.y + r + fs + 3);
    ctx.shadowBlur = 0;
  }, []);

  const paintPointer = useCallback((node, color, ctx) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  /* ── Render ──────────────────────────────────── */
  const totalNodes = graphData?.nodes.length ?? 0;
  const totalEdges = graphData?.links.length ?? 0;
  const visNodes   = filteredData?.nodes.length ?? 0;
  const visEdges   = filteredData?.links.length ?? 0;

  return (
    <div className="app-container">

      {/* ════════════ SIDEBAR ════════════ */}
      <div className="sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-brand">
            <div className="sidebar-badge">LAYER10</div>
            <div className="sidebar-title">Knowledge Graph</div>
          </div>

          {/* Filters */}
          <div className="sec-label">Filters</div>

          <div style={{ fontSize: '0.76rem', color: '#8a94a6', marginBottom: 6 }}>Entity Types</div>
          <div className="checkbox-group">
            {allTypes.map(t => {
              const isChecked = selectedTypes.length === 0 || selectedTypes.includes(t);
              return (
                <label key={t} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={e => {
                      // When all are checked (empty = all), unchecking one means "all except this"
                      const currentSet = selectedTypes.length === 0 ? allTypes : selectedTypes;
                      if (e.target.checked) {
                        const next = [...new Set([...currentSet, t])];
                        // If next = all types, reset to empty (= all)
                        setSelectedTypes(next.length === allTypes.length ? [] : next);
                      } else {
                        const next = currentSet.filter(x => x !== t);
                        setSelectedTypes(next.length === 0 ? [] : next);
                      }
                    }}
                  />
                  <span style={{ color: TYPE_COLORS[t] || '#636b82' }}>{TYPE_ICONS[t] || '❓'}</span>
                  <span>{t}</span>
                </label>
              );
            })}
          </div>

          <div style={{ fontSize: '0.76rem', color: '#8a94a6', marginBottom: 6, marginTop: 10 }}>Relationship Types</div>
          <div className="checkbox-group">
            {allRels.length === 0
              ? <span style={{ fontSize: '0.76rem', color: '#636b82' }}>No relationship types found</span>
              : allRels.map(r => {
                const isChecked = selectedRels.length === 0 || selectedRels.includes(r);
                return (
                  <label key={r} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        const currentSet = selectedRels.length === 0 ? allRels : selectedRels;
                        if (e.target.checked) {
                          const next = [...new Set([...currentSet, r])];
                          setSelectedRels(next.length === allRels.length ? [] : next);
                        } else {
                          const next = currentSet.filter(x => x !== r);
                          setSelectedRels(next.length === 0 ? [] : next);
                        }
                      }}
                    />
                    <span>{r}</span>
                  </label>
                );
              })
            }
          </div>

          <div className="slider-row" style={{ marginTop: 8 }}>
            <span className="slider-label">Min. Degree</span>
            <input type="range" min={0} max={20} value={minDegree} onChange={e => setMinDegree(+e.target.value)} />
            <span className="slider-val">{minDegree}</span>
          </div>

          <div className="slider-row">
            <span className="slider-label">Max Nodes</span>
            <input type="range" min={50} max={500} step={50} value={maxNodes} onChange={e => setMaxNodes(+e.target.value)} />
            <span className="slider-val">{maxNodes}</span>
          </div>

          <hr className="sidebar-divider" />

          {/* Search filter */}
          <div className="sec-label">Search</div>
          <input
            type="text"
            placeholder="Node name contains…"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
          />

          <hr className="sidebar-divider" />

          {/* Physics */}
          <div className="sec-label">Physics</div>
          <div className="toggle-row">
            <span className="toggle-label">Enable physics simulation</span>
            <label className="toggle">
              <input type="checkbox" checked={physicsOn} onChange={e => setPhysicsOn(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="slider-row">
            <span className="slider-label">Gravity</span>
            <input type="range" min={-5000} max={0} step={100} value={gravity} onChange={e => setGravity(+e.target.value)} />
            <span className="slider-val">{gravity}</span>
          </div>

          <hr className="sidebar-divider" />

          {/* Query — original style */}
          <h2 className="query-heading">LAYER10 MEMORY</h2>
          <input
            type="text"
            className="query-search-input"
            placeholder="Enter query (e.g., tiangolo)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className="query-btn-red" onClick={handleSearch}>QUERY GRAPH</button>

          <div className="results-scroll">
            {searchResults.map((p, i) => (
              <div key={i} className="result-card-red">
                <div className="result-type-red">{p.type}</div>
                <div className="result-entity-red">{p.entity}</div>
                <div className="result-desc-red">{p.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════ MAIN AREA ════════════ */}
      <div className="main-area">

        {/* Header */}
        <div className="kg-header">
          <div className="kg-badge">LAYER10</div>
          <div>
            <h1>Organizational Knowledge Graph</h1>
            <p>Entities, decisions, and relationships extracted from GitHub issues via LLM.</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="metrics-row">
          {[
            ['Total Nodes',        totalNodes],
            ['Total Edges',        totalEdges],
            ['Entity Types',       allTypes.length],
            ['Relationship Types', allRels.length],
          ].map(([label, val]) => (
            <div className="metric-card" key={label}>
              <div className="metric-label">{label}</div>
              <div className="metric-value">{val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs-bar">
          {['graph', 'analytics', 'explorer'].map(t => (
            <button
              key={t}
              className={`tab-btn ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'graph' ? '  Knowledge Graph  ' : t === 'analytics' ? '  Analytics  ' : '  Node Explorer  '}
            </button>
          ))}
        </div>

        {/* ── Tab: Graph ─────────────────────────── */}
        {activeTab === 'graph' && (
          <div className="tab-content">
            <div className="graph-topbar">
              <span className="pulse" />
              <b>{visNodes}</b><span>nodes</span>
              <span className="sep">·</span>
              <b>{visEdges}</b><span>edges</span>
              <span className="sep">·</span>
              <span>filtered view</span>
            </div>

            <div className="graph-canvas-wrap">
              {filteredData ? (
                <ForceGraph2D
                  ref={fgRef}
                  graphData={filteredData}
                  backgroundColor="#06070a"
                  nodeColor={getNodeColor}
                  nodeLabel="id"
                  nodeRelSize={5}
                  linkColor={() => 'rgba(0,180,255,0.55)'}
                  linkWidth={2}
                  linkDirectionalArrowLength={5}
                  linkDirectionalArrowRelPos={1}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleWidth={2}
                  linkDirectionalParticleColor={() => '#00e5ff'}
                  linkDirectionalParticleSpeed={0.004}
                  d3AlphaDecay={physicsOn ? 0.02 : 1}
                  d3VelocityDecay={physicsOn ? 0.3 : 1}
                  d3Force="charge"
                  nodeCanvasObject={paintNode}
                  nodePointerAreaPaint={paintPointer}
                />
              ) : (
                <div className="connecting-state">
                  <div className="spinner" />
                  <p>Connecting to Memory Server…</p>
                </div>
              )}
            </div>

            <div className="legend-strip">
              {Object.entries(TYPE_COLORS).map(([t, c]) => (
                <div className="legend-item" key={t}>
                  <div className="legend-dot" style={{ background: c, boxShadow: `0 0 7px ${c}` }} />
                  {TYPE_ICONS[t]} {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Analytics ─────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <div className="analytics-grid">
              <div className="chart-card">
                <div className="sec-label">Entity Type Distribution</div>
                <BarChart data={typeCounts} color="#00e5ff" />
              </div>
              <div className="chart-card">
                <div className="sec-label">Top 10 Relationship Types</div>
                <BarChart data={topRels} color="#b829ff" />
              </div>
            </div>

            <div className="sec-label">Top 15 Most-Connected Nodes</div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Total Degree</th>
                    <th>In-edges</th>
                    <th>Out-edges</th>
                  </tr>
                </thead>
                <tbody>
                  {degreeRows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.name}</td>
                      <td>{TYPE_ICONS[row.type] || '❓'} {row.type}</td>
                      <td style={{ fontFamily: "'Fira Code', monospace", color: '#00e5ff' }}>{row.total}</td>
                      <td>{row.in}</td>
                      <td>{row.out}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Node Explorer ─────────────────── */}
        {activeTab === 'explorer' && (
          <div className="explorer-tab">
            <select
              className="node-select"
              value={selectedNode || ''}
              onChange={e => setSelectedNode(e.target.value)}
            >
              <option value="">— Select a node —</option>
              {(graphData?.nodes || [])
                .slice()
                .sort((a, b) => String(a.id).localeCompare(String(b.id)))
                .map(n => (
                  <option key={n.id} value={n.id}>{n.id}</option>
                ))}
            </select>

            {selectedNode && nodeForExplorer && (
              <>
                <div className="node-card">
                  <div className="node-card-header">
                    <div className="node-dot" style={{ background: nodeColor, boxShadow: `0 0 10px ${nodeColor}` }} />
                    <h3>{TYPE_ICONS[nodeForExplorer.type] || '❓'} {nodeForExplorer.id}</h3>
                  </div>
                  <p><b>Type</b> &nbsp;{nodeForExplorer.type || 'Unknown'} &nbsp;&nbsp;|&nbsp;&nbsp; <b>ID</b> &nbsp;<code>{nodeForExplorer.id}</code></p>
                  <p>
                    <b>Total Degree</b> &nbsp;{inEdges.length + outEdges.length}
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    <b>Incoming</b> &nbsp;{inEdges.length}
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    <b>Outgoing</b> &nbsp;{outEdges.length}
                  </p>
                </div>

                <div className="edges-grid">
                  <div>
                    <div className="sec-label">← Incoming Relationships</div>
                    {inEdges.length === 0 && <p className="no-edges">No incoming edges.</p>}
                    {inEdges.map((l, i) => {
                      const src = typeof l.source === 'object' ? l.source.id : l.source;
                      const ev  = l.evidence || {};
                      return (
                        <Expander key={i} title={`${src} → ${l.relationship || '?'}`}>
                          <p>{ev.quote || 'No quote available.'}</p>
                          {ev.source_url && <a href={ev.source_url} target="_blank" rel="noreferrer">↗ view source</a>}
                        </Expander>
                      );
                    })}
                  </div>
                  <div>
                    <div className="sec-label">→ Outgoing Relationships</div>
                    {outEdges.length === 0 && <p className="no-edges">No outgoing edges.</p>}
                    {outEdges.map((l, i) => {
                      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
                      const ev  = l.evidence || {};
                      return (
                        <Expander key={i} title={`${l.relationship || '?'} → ${tgt}`}>
                          <p>{ev.quote || 'No quote available.'}</p>
                          {ev.source_url && <a href={ev.source_url} target="_blank" rel="noreferrer">↗ view source</a>}
                        </Expander>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}