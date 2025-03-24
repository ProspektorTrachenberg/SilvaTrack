
// DANE MASZYN
const machines = [
  {
    id: "M01",
    name: "Harwester 1",
    model: "Ponsse Ergo",
    number: "H-001",
    year: 2021,
    operator: "Jan Kowalski",
    lat: 51.5305,
    lng: 16.8925,
    status: "Pracuje"
  },
  {
    id: "M02",
    name: "Forwarder 2",
    model: "John Deere 1210G",
    number: "F-002",
    year: 2019,
    operator: "Anna Nowak",
    lat: 51.5340,
    lng: 16.8910,
    status: "Postój"
  },
  {
    id: "M03",
    name: "Harwester 3",
    model: "Komatsu 931XC",
    number: "H-003",
    year: 2022,
    operator: "Paweł Zieliński",
    lat: 51.5321,
    lng: 16.8895,
    status: "Awaria"
  }
];

const map = L.map('map').setView([51.531, 16.892], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const list = document.getElementById("machines");
const markers = {};

function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case "pracuje": return "green";
    case "postój": return "gold";
    case "awaria": return "red";
    default: return "gray";
  }
}

const filterDiv = document.getElementById("filter-container");
filterDiv.innerHTML = `
  <label><strong>Status:</strong> 
    <select id="statusFilter">
      <option value="">Wszystkie</option>
      <option value="Pracuje">Pracuje</option>
      <option value="Postój">Postój</option>
      <option value="Awaria">Awaria</option>
    </select>
  </label>
`;
document.getElementById("statusFilter").addEventListener("change", e => {
  renderMachineList(e.target.value);
});

function renderMachineList(filter = "") {
  list.innerHTML = "";
  Object.values(markers).forEach(m => map.removeLayer(m));

  machines.forEach(machine => {
    if (filter && machine.status !== filter) return;

    const color = getStatusColor(machine.status);
    const blinkClass = machine.status === "Awaria" ? "blink" : "";
    const iconType = machine.name.toLowerCase().includes("forwarder") ? "forwarder" : "harwester";

    const icon = L.divIcon({
      className: "",
      html: `
        <div style="position: relative; width: 32px; height: 38px;">
          <div class="${blinkClass}" style="
            width: 12px;
            height: 12px;
            background-color: ${color};
            border-radius: 50%;
            border: 2px solid white;
            position: absolute;
            top: -4px;
            left: 10px;
            z-index: 2;
          "></div>
          <img src="images/${iconType}.png" width="32" height="32"
               style="display: block; position: absolute; bottom: 0;" 
               onerror="this.style.display='none'" />
        </div>`
    });

    const popupContent = `
      <strong>${machine.name}</strong><br>
      Status: ${machine.status}<br>
      Model: ${machine.model}<br>
      Numer: ${machine.number}<br>
      Rok: ${machine.year}<br>
      Operator: ${machine.operator}
    `;

    const marker = L.marker([machine.lat, machine.lng], { icon }).addTo(map)
                   .bindPopup(popupContent);
    markers[machine.id] = marker;

    const li = document.createElement("li");
    li.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="images/${iconType}.png" width="32" height="32" alt="${iconType}" />
        <div>
          <strong>${machine.name}</strong><br>
          Status: ${machine.status}<br>
          Model: ${machine.model}<br>
          Operator: ${machine.operator}<br>
          <button onclick="openStatsWindow(${JSON.stringify(machine).replace(/"/g, "&quot;")})">📊</button>
        </div>
      </div>
    `;
    li.style.borderLeft = `5px solid ${color}`;
    li.addEventListener("click", () => {
      map.flyTo([machine.lat, machine.lng], 16);
      marker.openPopup();
    });
    list.appendChild(li);
  });
}

function openStatsWindow(machine) {
  const stats = {
    hours: Math.floor(Math.random() * 10) + 5,
    volume: Math.floor(Math.random() * 100) + 50,
    distance: Math.floor(Math.random() * 30) + 10,
    failures: Math.floor(Math.random() * 3)
  };

  const html = `
    <html>
    <head>
      <title>Statystyki - ${machine.name}</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    </head>
    <body style="font-family: Arial; padding: 20px;">
      <h2>${machine.name} – Statystyki</h2>
      <canvas id="chart" width="360" height="200"></canvas>
      <br>
      <button onclick="generatePDF()">📄 PDF</button>

      <script>
        const { jsPDF } = window.jspdf;
        const ctx = document.getElementById('chart').getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Godziny', 'm³ drewna', 'km', 'Awarie'],
            datasets: [{
              label: 'Wartość',
              data: [${stats.hours}, ${stats.volume}, ${stats.distance}, ${stats.failures}],
              backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#f44336']
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              title: { display: true, text: 'Raport' }
            }
          }
        });

        function generatePDF() {
          const doc = new jsPDF();
          doc.setFontSize(14);
          doc.text('Raport – ${machine.name}', 10, 20);
          doc.setFontSize(11);
          doc.text('Operator: ${machine.operator}', 10, 30);
          doc.text('Godziny: ${stats.hours}', 10, 40);
          doc.text('m³ drewna: ${stats.volume}', 10, 50);
          doc.text('km: ${stats.distance}', 10, 60);
          doc.text('Awarie: ${stats.failures}', 10, 70);
          doc.save('raport-${machine.name}.pdf');
        }
      </script>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

renderMachineList();
