// Cài đặt hiển thị đồ thị
const width = 600;
const height = 400;
const nodeRadius = 20;

// Khởi tạo SVG
const svg = d3.select("#graphContainer")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Dữ liệu đồ thị và trạng thái thuật toán
let nodes = [];
let links = [];
let simulation;
let distances = [];
let visited = [];
let currentStep = 0;
let totalSteps = 0;
let animationSpeed = 1000;
let selectedStartNode = null;
let selectedEndNode = null;
let isManualMode = false;
let algorithmHistory = [];
let isRunning = false;

// Cấu trúc lưu trữ từng bước của thuật toán
class AlgorithmStep {
    constructor(distances, visited, currentNode, previous, message, codeLine, activeEdge = null, processedEdges = []) {
        this.distances = [...distances];
        this.visited = [...visited];
        this.currentNode = currentNode;
        this.previous = previous ? [...previous] : null;
        this.message = message;
        this.codeLine = codeLine;
        this.activeEdge = activeEdge;  // Cạnh đang xét {source, target, weight}
        this.processedEdges = processedEdges;  // Các cạnh đã xét
    }
}

function updateExecutionMode() {
    isManualMode = document.getElementById('executionMode').value === 'manual';
    updateStepControls();
}

function updateStepControls() {
    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    document.getElementById('currentStep').textContent = currentStep;
    document.getElementById('totalSteps').textContent = totalSteps;

    if (!isManualMode || !isRunning) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    prevBtn.disabled = currentStep <= 0;
    nextBtn.disabled = currentStep >= totalSteps;
}

function applyStep(step) {
    if (!step) return;

    // Update visualization
    updateArrayVisualization(step.distances, step.visited, step.currentNode);
    highlightCodeLine(step.codeLine);
    
    // Cập nhật hiển thị cạnh
    svg.selectAll("line")
        .style("stroke", function(d) {
            // Nếu là cạnh đang xét
            if (step.activeEdge && 
                ((d.source.id === step.activeEdge.source && d.target.id === step.activeEdge.target) ||
                 (d.source.id === step.activeEdge.target && d.target.id === step.activeEdge.source))) {
                return "#ffff00";  // Màu vàng cho cạnh đang xét
            }
            // Nếu là cạnh đã xét
            for (let edge of step.processedEdges) {
                if ((d.source.id === edge.source && d.target.id === edge.target) ||
                    (d.source.id === edge.target && d.target.id === edge.source)) {
                    return "#4CAF50";  // Màu xanh cho cạnh đã xét
                }
            }
            // Nếu là cạnh trong đường đi ngắn nhất
            if (step.previous) {
                let path = [];
                let current = selectedEndNode;
                if (step.distances[selectedEndNode] !== Infinity) {
                    while (current !== null) {
                        path.unshift(current);
                        current = step.previous[current];
                    }
                    for (let i = 0; i < path.length - 1; i++) {
                        if ((d.source.id === path[i] && d.target.id === path[i + 1]) ||
                            (d.source.id === path[i + 1] && d.target.id === path[i])) {
                            return "#ff0000";  // Màu đỏ cho đường đi ngắn nhất
                        }
                    }
                }
            }
            return "#999";  // Màu mặc định
        })
        .style("stroke-width", function(d) {
            // Tăng độ dày cho cạnh đang xét và cạnh trong đường đi ngắn nhất
            if (step.activeEdge && 
                ((d.source.id === step.activeEdge.source && d.target.id === step.activeEdge.target) ||
                 (d.source.id === step.activeEdge.target && d.target.id === step.activeEdge.source))) {
                return 4;
            }
            if (step.previous) {
                let path = [];
                let current = selectedEndNode;
                if (step.distances[selectedEndNode] !== Infinity) {
                    while (current !== null) {
                        path.unshift(current);
                        current = step.previous[current];
                    }
                    for (let i = 0; i < path.length - 1; i++) {
                        if ((d.source.id === path[i] && d.target.id === path[i + 1]) ||
                            (d.source.id === path[i + 1] && d.target.id === path[i])) {
                            return 4;
                        }
                    }
                }
            }
            return 2;
        });
    
    addLogEntry(step.message);
}

async function previousStep() {
    if (currentStep > 0) {
        currentStep--;
        applyStep(algorithmHistory[currentStep]);
        updateStepControls();
    }
}

async function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        applyStep(algorithmHistory[currentStep]);
        updateStepControls();
    }
}

function recordStep(distances, visited, currentNode, previous, message, codeLine, activeEdge = null, processedEdges = []) {
    const step = new AlgorithmStep(distances, visited, currentNode, previous, message, codeLine, activeEdge, processedEdges);
    algorithmHistory.push(step);
    totalSteps = algorithmHistory.length - 1;
    
    if (!isManualMode) {
        currentStep = totalSteps;
        applyStep(step);
    }
    updateStepControls();
}

// Sample code for display
const sampleCode = [
    "// import visualization libraries {",
    "const { Tracer, Array1DTracer, GraphTracer, LogTracer, Randomize, Layout, VerticalLayout } = require('algorithm-visualizer');",
    "// }",
    "",
    "const G = Randomize.Graph({ N: 5, ratio: 1, directed: false, weighted: true });",
    "const MAX_VALUE = Infinity;",
    "const S = []; // S[end] returns the distance from start node to end node",
    "for (let i = 0; i < G.length; i++) S[i] = MAX_VALUE;",
    "",
    "// define tracer variables {",
    "const tracer = new GraphTracer().directed(false).weighted();",
    "const tracerS = new Array1DTracer();",
    "const logger = new LogTracer();",
    "Layout.setRoot(new VerticalLayout([tracer, tracerS, logger]));",
    "tracer.log(logger);",
    "tracer.set(G);",
    "tracerS.set(S);",
    "Tracer.delay();",
    "// }",
    "",
    "function Dijkstra(start, end) {",
    "  let minIndex;",
    "  let minDistance;",
    "  const D = []; // D[i] indicates whether the i-th node is discovered or not",
    "  for (let i = 0; i < G.length; i++) D.push(false);",
    "  S[start] = 0; // Starting node is at distance 0 from itself",
    "  // visualize {",
    "  tracerS.patch(start, S[start]);",
    "  Tracer.delay();",
    "  tracerS.depatch(start);",
    "  tracerS.select(start);",
    "  // }",
    "  let k = G.length;",
    "  while (k--) {",
    "    // Finding a node with the shortest distance from S[minIndex]",
    "    minDistance = MAX_VALUE;",
    "    for (let i = 0; i < G.length; i++) {",
    "      if (S[i] < minDistance && !D[i]) {",
    "        minDistance = S[i];",
    "        minIndex = i;",
    "      }",
    "    }",
    "    if (minDistance === MAX_VALUE) break; // If there is no edge from current node, jump out of loop",
    "    D[minIndex] = true;",
    "    // visualize {",
    "    tracerS.select(minIndex);",
    "    tracer.visit(minIndex);",
    "    Tracer.delay();",
    "    // }",
    "    // For every unvisited neighbour of current node, we check",
    "    // whether the path to it is shorter if going over the current node",
    "    for (let i = 0; i < G.length; i++) {",
    "      if (G[minIndex][i] && S[i] > S[minIndex] + G[minIndex][i]) {",
    "        S[i] = S[minIndex] + G[minIndex][i];",
    "        // visualize {",
    "        tracerS.patch(i, S[i]);",
    "        tracer.visit(i, minIndex, S[i]);",
    "        Tracer.delay();",
    "        tracerS.depatch(i);",
    "        tracer.leave(i, minIndex);",
    "        Tracer.delay();",
    "        // }",
    "      }",
    "    }",
    "    // visualize {",
    "    tracer.leave(minIndex);",
    "    Tracer.delay();",
    "    // }",
    "  }",
    "  // logger {",
    "  if (S[end] === MAX_VALUE) {",
    "    logger.println(`there is no path from ${start} to ${end}`);",
    "  } else {",
    "    logger.println(`the shortest path from ${start} to ${end} is ${S[end]}`);",
    "  }",
    "  // }",
    "}",
    "",
    "const s = Randomize.Integer({ min: 0, max: G.length - 1 }); // s = start node",
    "let e; // e = end node",
    "do {",
    "  e = Randomize.Integer({ min: 0, max: G.length - 1 });",
    "} while (s === e);",
    "// logger {",
    "logger.println(`finding the shortest path from ${s} to ${e}`);",
    "Tracer.delay();",
    "// }",
    "Dijkstra(s, e);"
];

// Initialize code display
function initializeCodeDisplay() {
    const codeArea = document.getElementById('codeArea');
    codeArea.innerHTML = sampleCode
        .map((line, index) => `<div class="code-line" id="line-${index}"><span class="line-number">${index + 1}</span>${line}</div>`)
        .join('\n');
}

// Khởi tạo hiển thị mảng
function initializeArrayVisualization() {
    const arrayContainer = document.getElementById('arrayVisualization');
    arrayContainer.innerHTML = `
        <div style="margin-bottom: 10px;">
            <div style="margin-bottom: 5px;">Mảng Khoảng Cách:</div>
            <div id="distanceArray" style="display: flex; gap: 5px;"></div>
        </div>
        <div>
            <div style="margin-bottom: 5px;">Mảng Đã Thăm:</div>
            <div id="visitedArray" style="display: flex; gap: 5px;"></div>
        </div>
    `;
    
    const distanceArray = document.getElementById('distanceArray');
    const visitedArray = document.getElementById('visitedArray');
    
    for (let i = 0; i < nodes.length; i++) {
        // Tạo ô cho mảng khoảng cách
        const distCell = document.createElement('div');
        distCell.className = 'array-cell';
        distCell.id = `dist-${i}`;
        distCell.innerHTML = `
            <div class="node-label">${i}</div>
            <div class="value">∞</div>
        `;
        distanceArray.appendChild(distCell);

        // Tạo ô cho mảng đã thăm
        const visitCell = document.createElement('div');
        visitCell.className = 'array-cell';
        visitCell.id = `visit-${i}`;
        visitCell.innerHTML = `
            <div class="node-label">${i}</div>
            <div class="value">chưa</div>
        `;
        visitedArray.appendChild(visitCell);
    }
}

// Thêm log
function addLogEntry(message) {
    const logContainer = document.getElementById('logContainer');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Update the highlightCodeLine function to match the sample code line numbers
function highlightCodeLine(lineNumber) {
    document.querySelectorAll('.code-line').forEach(line => line.classList.remove('highlight'));
    if (lineNumber !== null) {
        const line = document.getElementById(`line-${lineNumber - 1}`);
        if (line) line.classList.add('highlight');
    }
}

// Cập nhật mảng
function updateArrayVisualization(distances, visited, currentNode = null) {
    // Cập nhật mảng khoảng cách
    for (let i = 0; i < distances.length; i++) {
        const cell = document.getElementById(`dist-${i}`);
        if (cell) {
            const value = distances[i] === Infinity ? '∞' : distances[i];
            cell.querySelector('.value').textContent = value;
            
            cell.className = 'array-cell';
            if (i === currentNode) {
                cell.classList.add('current');
            } else if (visited[i]) {
                cell.classList.add('visited');
            }
        }
    }

    // Cập nhật mảng đã thăm
    for (let i = 0; i < visited.length; i++) {
        const cell = document.getElementById(`visit-${i}`);
        if (cell) {
            cell.querySelector('.value').textContent = visited[i] ? 'đã thăm' : 'chưa';
            
            cell.className = 'array-cell';
            if (i === currentNode) {
                cell.classList.add('current');
            } else if (visited[i]) {
                cell.classList.add('visited');
            }
        }
    }
}

// Xử lý khi click vào node
function handleNodeClick(d) {
    if (selectedStartNode === null) {
        selectedStartNode = d.id;
        d3.select(this).select("circle")
            .classed("start", true);
        addLogEntry(`Đã chọn đỉnh ${d.id} làm điểm bắt đầu`);
    } else if (selectedEndNode === null && d.id !== selectedStartNode) {
        selectedEndNode = d.id;
        d3.select(this).select("circle")
            .classed("end", true);
        addLogEntry(`Đã chọn đỉnh ${d.id} làm điểm kết thúc`);
    }
}

// Reset lựa chọn node
function resetNodeSelection() {
    selectedStartNode = null;
    selectedEndNode = null;
    svg.selectAll(".node circle")
        .classed("start", false)
        .classed("end", false);
    addLogEntry("Đã reset lựa chọn các đỉnh");
}

// Initialize graph with 5 nodes
function initializeGraph() {
    // Clear existing graph
    svg.selectAll("*").remove();
    currentStep = 0;
    resetNodeSelection();
    
    // Create nodes
    nodes = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height
    }));

    // Create edges (similar to the pentagon shape with cross connections)
    links = [
        {source: 0, target: 1, weight: Math.floor(Math.random() * 10) + 1},
        {source: 1, target: 2, weight: Math.floor(Math.random() * 10) + 1},
        {source: 2, target: 3, weight: Math.floor(Math.random() * 10) + 1},
        {source: 3, target: 4, weight: Math.floor(Math.random() * 10) + 1},
        {source: 4, target: 0, weight: Math.floor(Math.random() * 10) + 1},
        {source: 0, target: 2, weight: Math.floor(Math.random() * 10) + 1},
        {source: 1, target: 3, weight: Math.floor(Math.random() * 10) + 1},
        {source: 2, target: 4, weight: Math.floor(Math.random() * 10) + 1},
        {source: 3, target: 0, weight: Math.floor(Math.random() * 10) + 1},
        {source: 4, target: 1, weight: Math.floor(Math.random() * 10) + 1},
    ];

    createVisualization();
    initializeArrayVisualization();
    initializeCodeDisplay();
    addLogEntry("Graph initialized - Click nodes to select start and end points");
}

function createVisualization() {
    // Create the links
    const link = svg.selectAll(".link")
        .data(links)
        .enter()
        .append("g")
        .attr("class", "link");

    link.append("line")
        .style("stroke", "#999")
        .style("stroke-width", 2);

    link.append("text")
        .attr("class", "weight-label")
        .attr("fill", "white")
        .style("font-size", "12px")
        .text(d => d.weight);

    // Create the nodes
    const node = svg.selectAll(".node")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .on("click", function(event, d) {
            handleNodeClick.call(this, d);
        });

    node.append("circle")
        .attr("r", nodeRadius)
        .style("fill", "#666");

    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".3em")
        .style("fill", "white")
        .text(d => d.id);

    // Create force simulation
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", ticked);

    function ticked() {
        link.select("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        link.select("text")
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    }
}

async function runDijkstra() {
    if (selectedStartNode === null || selectedEndNode === null) {
        addLogEntry("Vui lòng chọn cả điểm bắt đầu và điểm kết thúc!");
        return;
    }

    isRunning = true;
    currentStep = 0;
    totalSteps = 0;
    algorithmHistory = [];
    let processedEdges = [];
    
    svg.selectAll("line")
        .style("stroke", "#999")
        .style("stroke-width", 2);
    
    distances = new Array(nodes.length).fill(Infinity);
    visited = new Array(nodes.length).fill(false);
    const previous = new Array(nodes.length).fill(null);
    distances[selectedStartNode] = 0;
    
    let initialArrayState = `Mảng khoảng cách: ${nodes.map((_, i) => 
        `[${i}] = ${distances[i] === Infinity ? '∞' : distances[i]}`
    ).join(', ')}`;
    
    recordStep(distances, visited, null, null, 
        `Khởi tạo thuật toán:\n` +
        `- Đặt khoảng cách từ đỉnh xuất phát ${selectedStartNode} = 0\n` +
        `- ${initialArrayState}`, 6, null, processedEdges);
    if (!isManualMode) await sleep(animationSpeed);

    for (let i = 0; i < nodes.length; i++) {
        const minNode = findMinDistance(distances, visited);
        if (minNode === -1) break;
        
        visited[minNode] = true;
        let currentState = `Mảng khoảng cách: ${nodes.map((_, i) => 
            `[${i}]${i === minNode ? '*' : ''} = ${distances[i] === Infinity ? '∞' : distances[i]}`
        ).join(', ')}`;
        
        let adjacentInfo = links.filter(link => 
            (link.source.id === minNode || link.target.id === minNode)
        ).map(link => {
            const neighbor = link.source.id === minNode ? link.target.id : link.source.id;
            return `${neighbor}(${link.weight})`;
        }).join(', ');

        recordStep(distances, visited, minNode, previous, 
            `Đang xử lý đỉnh ${minNode}:\n` +
            `- Khoảng cách từ điểm xuất phát: ${distances[minNode]}\n` +
            `- Các đỉnh kề và trọng số: [${adjacentInfo}]\n` +
            `- ${currentState}\n` +
            `- Các đỉnh đã thăm: [${visited.map((v, i) => v ? i : null).filter(x => x !== null).join(', ')}]`, 
            15, null, processedEdges);
        if (!isManualMode) await sleep(animationSpeed);
        
        const adjacentNodes = links.filter(link => 
            (link.source.id === minNode || link.target.id === minNode)
        );

        for (const link of adjacentNodes) {
            const neighbor = link.source.id === minNode ? link.target.id : link.source.id;
            const weight = link.weight;

            if (!visited[neighbor]) {
                // Đánh dấu cạnh đang xét
                const activeEdge = {
                    source: minNode,
                    target: neighbor,
                    weight: weight
                };

                const newDist = distances[minNode] + weight;
                if (newDist < distances[neighbor]) {
                    const oldDist = distances[neighbor] === Infinity ? '∞' : distances[neighbor];
                    distances[neighbor] = newDist;
                    previous[neighbor] = minNode;
                    
                    let updatedState = `Mảng khoảng cách: ${nodes.map((_, i) => 
                        `[${i}]${i === neighbor ? '*' : ''} = ${distances[i] === Infinity ? '∞' : distances[i]}`
                    ).join(', ')}`;
                    
                    // Thêm cạnh vào danh sách đã xét
                    processedEdges.push(activeEdge);
                    
                    recordStep(distances, visited, minNode, previous, 
                        `Cập nhật đỉnh ${neighbor}:\n` +
                        `- Khoảng cách cũ: ${oldDist}\n` +
                        `- Khoảng cách mới: ${newDist} (qua đỉnh ${minNode}, cạnh=${weight})\n` +
                        `- ${updatedState}`, 
                        24, activeEdge, [...processedEdges]);
                    if (!isManualMode) await sleep(animationSpeed);
                } else {
                    recordStep(distances, visited, minNode, previous, 
                        `Không cập nhật đỉnh ${neighbor}:\n` +
                        `- Đường đi mới (${newDist}) không ngắn hơn đường đi cũ (${distances[neighbor] === Infinity ? '∞' : distances[neighbor]})\n` +
                        `- Qua đường đi: ${minNode} → ${neighbor} (trọng số = ${weight})`, 
                        24, activeEdge, processedEdges);
                    if (!isManualMode) await sleep(animationSpeed);
                }
            }
        }
    }

    const finalDistance = distances[selectedEndNode];
    let message;
    if (finalDistance === Infinity) {
        message = `Không tìm thấy đường đi từ đỉnh ${selectedStartNode} đến đỉnh ${selectedEndNode}!\n` +
                 `Trạng thái cuối cùng:\n` +
                 `Mảng khoảng cách: ${nodes.map((_, i) => 
                     `[${i}] = ${distances[i] === Infinity ? '∞' : distances[i]}`
                 ).join(', ')}`;
    } else {
        let path = [];
        let current = selectedEndNode;
        while (current !== null) {
            path.unshift(current);
            current = previous[current];
        }
        message = `Tìm thấy đường đi ngắn nhất từ ${selectedStartNode} đến ${selectedEndNode}!\n` +
                 `- Độ dài đường đi: ${finalDistance}\n` +
                 `- Đường đi: ${path.join(' → ')}\n` +
                 `- Trạng thái cuối cùng:\n` +
                 `  Mảng khoảng cách: ${nodes.map((_, i) => 
                     `[${i}] = ${distances[i] === Infinity ? '∞' : distances[i]}`
                 ).join(', ')}`;
    }
    
    recordStep(distances, visited, null, previous, message, null, null, processedEdges);

    if (isManualMode) {
        currentStep = 0;
        applyStep(algorithmHistory[0]);
    }
    
    updateStepControls();
}

function findMinDistance(distances, visited) {
    let min = Infinity;
    let minIndex = -1;

    for (let i = 0; i < distances.length; i++) {
        if (!visited[i] && distances[i] < min) {
            min = distances[i];
            minIndex = i;
        }
    }

    return minIndex;
}

function highlightPath(previous, endNode) {
    let path = [];
    let current = endNode;
    
    // Only build path if end node is reachable
    if (distances[endNode] !== Infinity) {
        while (current !== null) {
            path.unshift(current);
            current = previous[current];
        }
    }

    svg.selectAll("line")
        .style("stroke", function(d) {
            for (let i = 0; i < path.length - 1; i++) {
                if ((d.source.id === path[i] && d.target.id === path[i + 1]) ||
                    (d.source.id === path[i + 1] && d.target.id === path[i])) {
                    return "#ff0000";
                }
            }
            return "#999";
        })
        .style("stroke-width", function(d) {
            for (let i = 0; i < path.length - 1; i++) {
                if ((d.source.id === path[i] && d.target.id === path[i + 1]) ||
                    (d.source.id === path[i + 1] && d.target.id === path[i])) {
                    return 4;
                }
            }
            return 2;
        });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Speed control
document.getElementById('speedSlider').addEventListener('input', function(e) {
    animationSpeed = 2000 - (e.target.value * 19);
});

// Initialize the visualization
initializeGraph();
updateExecutionMode();

// Add these styles to the existing styles in index.html
const styles = `
    .array-cell {
        display: flex;
        flex-direction: column;
        width: 50px;
        height: 50px;
        border: 1px solid #666;
        text-align: center;
        background-color: #333;
        padding: 2px;
    }
    .array-cell .node-label {
        font-size: 12px;
        color: #888;
        border-bottom: 1px solid #666;
    }
    .array-cell .value {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
    }
    .array-cell.current {
        background-color: #2d4f2d;
        border-color: #4CAF50;
    }
    .array-cell.visited {
        background-color: #1e3f1e;
    }
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet); 