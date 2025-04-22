// Import các thư viện để hiển thị thuật toán {
const { Tracer, Array1DTracer, GraphTracer, LogTracer, Randomize, Layout, VerticalLayout } = require('algorithm-visualizer');
// }

// Tạo đồ thị ngẫu nhiên với 5 đỉnh, không có hướng và có trọng số
const G = Randomize.Graph({ N: 5, ratio: 1, directed: false, weighted: true });
const MAX_VALUE = Infinity;
const S = []; // S[i] lưu khoảng cách ngắn nhất từ đỉnh bắt đầu đến đỉnh i
// Khởi tạo mảng khoảng cách với giá trị vô cùng
for (let i = 0; i < G.length; i++) S[i] = MAX_VALUE;

// Khởi tạo các biến để hiển thị {
// GraphTracer: hiển thị đồ thị
// Array1DTracer: hiển thị mảng khoảng cách
// LogTracer: hiển thị log
const tracer = new GraphTracer().directed(false).weighted();
const tracerS = new Array1DTracer();
const logger = new LogTracer();
Layout.setRoot(new VerticalLayout([tracer, tracerS, logger]));
tracer.log(logger);
tracer.set(G);
tracerS.set(S);
Tracer.delay();
// }

function Dijkstra(start, end) {
  let minIndex;
  let minDistance;
  const D = []; // D[i] đánh dấu đỉnh i đã được thăm hay chưa
  // Khởi tạo mảng đánh dấu các đỉnh chưa thăm
  for (let i = 0; i < G.length; i++) D.push(false);
  S[start] = 0; // Khoảng cách từ đỉnh bắt đầu đến chính nó là 0
  // Hiển thị {
  tracerS.patch(start, S[start]);
  Tracer.delay();
  tracerS.depatch(start);
  tracerS.select(start);
  // }
  let k = G.length;
  while (k--) {
    // Tìm đỉnh chưa thăm có khoảng cách nhỏ nhất từ đỉnh bắt đầu
    minDistance = MAX_VALUE;
    for (let i = 0; i < G.length; i++) {
      if (S[i] < minDistance && !D[i]) {
        minDistance = S[i];
        minIndex = i;
      }
    }
    // Nếu không tìm thấy đường đi, thoát vòng lặp
    if (minDistance === MAX_VALUE) break;
    D[minIndex] = true; // Đánh dấu đã thăm đỉnh này
    // Hiển thị {
    tracerS.select(minIndex);
    tracer.visit(minIndex);
    Tracer.delay();
    // }
    // Kiểm tra tất cả các đỉnh kề chưa thăm
    // Nếu đường đi qua đỉnh hiện tại ngắn hơn, cập nhật khoảng cách
    for (let i = 0; i < G.length; i++) {
      if (G[minIndex][i] && S[i] > S[minIndex] + G[minIndex][i]) {
        S[i] = S[minIndex] + G[minIndex][i];
        // Hiển thị {
        tracerS.patch(i, S[i]);
        tracer.visit(i, minIndex, S[i]);
        Tracer.delay();
        tracerS.depatch(i);
        tracer.leave(i, minIndex);
        Tracer.delay();
        // }
      }
    }
    // Hiển thị {
    tracer.leave(minIndex);
    Tracer.delay();
    // }
  }
  // Hiển thị kết quả {
  if (S[end] === MAX_VALUE) {
    logger.println(`Không tìm thấy đường đi từ ${start} đến ${end}`);
  } else {
    logger.println(`Đường đi ngắn nhất từ ${start} đến ${end} có độ dài là ${S[end]}`);
  }
  // }
}

// Chọn ngẫu nhiên đỉnh bắt đầu
const s = Randomize.Integer({ min: 0, max: G.length - 1 });
// Chọn ngẫu nhiên đỉnh kết thúc (khác đỉnh bắt đầu)
let e;
do {
  e = Randomize.Integer({ min: 0, max: G.length - 1 });
} while (s === e);
// Hiển thị {
logger.println(`Tìm đường đi ngắn nhất từ đỉnh ${s} đến đỉnh ${e}`);
Tracer.delay();
// }
Dijkstra(s, e); 