/**
 * Shared chart color palette utilities.
 *
 * Group/label colors follow a "zipped" cold->warm scheme: group i's own
 * color is COLD_PANEL[i]; its labels (in severity order) get an even split
 * of the gradient from that cold stop to WARM_PANEL[i].
 */

export const COLD_PANEL = ['#1e88e5', '#2e7d32', '#8e24aa', '#00acc1', '#3949ab', '#6d4c41']; // blue, green, purple, cyan, indigo, brown
export const WARM_PANEL = ['#e53935', '#fb8c00', '#d81b60', '#f4511e', '#c62828', '#ad1457']; // red, orange, pink, deep-orange, dark red, dark pink
export const CHART_COLOR_POOL = [...COLD_PANEL, ...WARM_PANEL];
export const NEUTRAL_LABEL_COLOR = '#9e9e9e'; // gray, for 'N/A'

export const mixHexColors = (hexA, hexB, t) => {
  const [ar, ag, ab] = [0, 2, 4].map(i => parseInt(hexA.slice(1 + i, 3 + i), 16));
  const [br, bg, bb] = [0, 2, 4].map(i => parseInt(hexB.slice(1 + i, 3 + i), 16));
  const mix = (a, b) => Math.round(a + (b - a) * t).toString(16).padStart(2, '0');
  return `#${mix(ar, br)}${mix(ag, bg)}${mix(ab, bb)}`;
};

// Equal split of the cold->warm gradient across `total` labels: total=1 ->
// [cold]; total=N -> N colors from cold (t=0) to warm (t=1) at even steps.
export const sampleGradient = (coldHex, warmHex, total) => {
  if (total <= 1) return [coldHex];
  return Array.from({ length: total }, (_, i) => mixHexColors(coldHex, warmHex, i / (total - 1)));
};

// Deterministic ascending order, with no dependency on async-loaded data
// (e.g. Redux study info arriving after first paint), so the same order
// shows up everywhere groups are listed - table columns, chart axes/legends,
// and color panel indexing - with no risk of it changing mid-load.
export const getOrderedGroups = (groupKeys) => [...groupKeys].sort();

/**
 * Get chart color by index (rotates through the shared color pool). Used
 * only for data with no fixed group/label identity (e.g. per-ward,
 * per-site slices).
 */
export const getChartColor = (index) => CHART_COLOR_POOL[index % CHART_COLOR_POOL.length];

/**
 * Compute persistent, deterministic colors for every group and label.
 * Each group gets an index (via getOrderedGroups' plain ascending sort)
 * into the zipped COLD_PANEL/WARM_PANEL; its own color is the cold stop,
 * and its labels (in FHIR severity order) get an even split of the
 * gradient from that cold stop to the group's warm stop.
 *
 * @param {string[]} groupKeys - Raw (unordered) group names present in data
 * @param {Array<{group: string, label: string}>} labelHierarchy - Study-declared label hierarchy (document order = severity order)
 * @param {Object<string,string>} labelToGroup - Fallback label -> group map for data-only labels not declared in the study
 * @returns {{ groupColors: Object<string,string>, labelColors: Object<string,string> }}
 */
export const buildColorAssignments = (groupKeys, labelHierarchy, labelToGroup) => {
  const groupOrder = getOrderedGroups(groupKeys || []);
  const groupColors = {};
  groupOrder.forEach((group, i) => {
    groupColors[group] = COLD_PANEL[i % COLD_PANEL.length];
  });

  // group -> ordered labels (severity order): seed from the study's
  // declared FHIR label hierarchy (document order = mild -> severe
  // authoring order), then append any data-only labels (not declared in
  // the study) via labelToGroup in first-seen order.
  const byGroup = {};
  (labelHierarchy || []).forEach(({ group, label }) => {
    if (!label || label === 'N/A' || !group) return;
    if (!byGroup[group]) byGroup[group] = [];
    if (!byGroup[group].includes(label)) byGroup[group].push(label);
  });
  Object.entries(labelToGroup || {}).forEach(([label, group]) => {
    if (!label || label === 'N/A' || !group) return;
    if (!byGroup[group]) byGroup[group] = [];
    if (!byGroup[group].includes(label)) byGroup[group].push(label);
  });

  const labelColors = {};
  Object.entries(byGroup).forEach(([group, labels]) => {
    const gi = groupOrder.indexOf(group);
    const idx = gi >= 0 ? gi : groupOrder.length; // unknown group falls past the known ones
    const cold = COLD_PANEL[idx % COLD_PANEL.length];
    const warm = WARM_PANEL[idx % WARM_PANEL.length];
    sampleGradient(cold, warm, labels.length).forEach((color, rank) => {
      labelColors[labels[rank]] = color;
    });
  });

  return { groupColors, labelColors };
};

// Recruitment-status palette (Enrolled/Ineligible/Declined/Other) shared
// across tracking pages' stacked status charts.
export const STATUS_COLORS = {
  enrolled: '#2e7d32',
  ineligible: '#ed6c02',
  declined: '#d32f2f',
  other: '#9e9e9e',
};

// Sequential single-hue (blue) ramp for heat-mapping a percent value:
// lightest step reads as "near zero", darkest as "dominant".
export const REASON_HEAT_STEPS = [
  { max: 0, color: 'transparent', dark: false },
  { max: 5, color: '#cde2fb', dark: false },
  { max: 10, color: '#9ec5f4', dark: false },
  { max: 20, color: '#6da7ec', dark: false },
  { max: 30, color: '#3987e5', dark: false },
  { max: 45, color: '#256abf', dark: true },
  { max: 65, color: '#184f95', dark: true },
  { max: 100, color: '#0d366b', dark: true },
];

export const heatColorForPercent = (percent, steps = REASON_HEAT_STEPS) => {
  return steps.find(s => percent <= s.max) || steps[steps.length - 1];
};
