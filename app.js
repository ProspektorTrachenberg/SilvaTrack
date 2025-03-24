// === Inicjalizacja mapy ===
const map = L.map('map').setView([51.531, 16.892], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// === Dane maszyn ===
const machines = [
  {
    id: "M01",
    name: "Harwester 1",
    model: "Ponsse Ergo",
    number: "H-001",
    year: 2021,
    operator: "Jan Kowalski",
    lat: 51.5305,
    lng: 16.8931,
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

// === FILTR STATUSU ===
const filterDiv = document.getElementById("filter-container");
filterDiv.innerHTML = `
  <label><strong>Filtruj po statusie:</strong>
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
    const iconType = machine.name.toLowerCase().includes('forwarder') ? 'forwarder' : 'harvester';

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
               style="display: block; position: absolute; bottom: 0;" />
        </div>
      `,
      iconSize: [32, 38],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const popupContent = `
      <strong>${machine.name}</strong><br>
      Status: ${machine.status}<br>
      Model: ${machine.model}<br>
      Numer: ${machine.number}<br>
      Rok: ${machine.year}<br>
      Operator: ${machine.operator}
    `;

    const marker = L.marker([machine.lat, machine.lng], { icon }).addTo(map).bindPopup(popupContent);
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
      <button onclick='openStatsWindow(${JSON.stringify(machine).replace(/"/g, '&quot;')})'>📊 Statystyki</button>
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

renderMachineList();

// === Dynamiczne warstwy WMS ===
const availableWmsLayers = {
  0: "Granice RDLP",
  1: "Granice nadleśnictw",
  2: "Granice leśnictw",
  3: "Oddziały leśne",
  4: "Powierzchnie próbne"
};

const wmsLayers = {};
const wmsLayerGroup = L.layerGroup().addTo(map);

const wmsContainer = document.getElementById("wms-layers");
for (const [id, label] of Object.entries(availableWmsLayers)) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "wms-layer-" + id;
  checkbox.dataset.layerId = id;
  checkbox.checked = (id === "3");

  const lbl = document.createElement("label");
  lbl.appendChild(checkbox);
  lbl.appendChild(document.createTextNode(" " + label));
  wmsContainer.appendChild(lbl);

  checkbox.addEventListener("change", function () {
    const lid = this.dataset.layerId;
    if (this.checked) {
      const layer = L.tileLayer.wms("https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_BDL/MapServer/WMSServer", {
        layers: lid,
        format: "image/png",
        transparent: true,
        attribution: "Lasy Państwowe"
      });
      wmsLayers[lid] = layer;
      wmsLayerGroup.addLayer(layer);
    } else {
      if (wmsLayers[lid]) {
        wmsLayerGroup.removeLayer(wmsLayers[lid]);
        delete wmsLayers[lid];
      }
    }
  });

  wmsContainer.appendChild(document.createElement("br"));
}

// === Obsługa wgrywania KML ===
const kmlInput = document.getElementById("kml-input");
const kmlFilesList = document.getElementById("kml-files");
const kmlLayers = [];

kmlInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const kmlLayer = omnivore.kml.parse(e.target.result);
      kmlLayer.addTo(map);

      // Dodaj warstwę do listy
      const layerEntry = {
        name: file.name,
        layer: kmlLayer,
        visible: true
      };
      kmlLayers.push(layerEntry);
      addKmlToList(layerEntry);
    };
    reader.readAsText(file);
  });

  // Reset input, żeby można było dodać ten sam plik ponownie
  event.target.value = "";
});

function addKmlToList(entry) {
  const li = document.createElement("li");
  li.style.marginBottom = "5px";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true;
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      entry.layer.addTo(map);
      entry.visible = true;
    } else {
      map.removeLayer(entry.layer);
      entry.visible = false;
    }
  });

  const nameSpan = document.createElement("span");
  nameSpan.textContent = " " + entry.name + " ";

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "🗑 Usuń";
  removeBtn.style.marginLeft = "10px";
  removeBtn.addEventListener("click", () => {
    map.removeLayer(entry.layer);
    kmlFilesList.removeChild(li);
  });

  li.appendChild(checkbox);
  li.appendChild(nameSpan);
  li.appendChild(removeBtn);
  kmlFilesList.appendChild(li);
}
function openStatsWindow(machine) {
  const html = `
    <html>
    <head>
      <title>Statystyki - ${machine.name}</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    </head>
    <body style="font-family: Arial; padding: 20px;">
      <h2>${machine.name} – Statystyki</h2>
      <label for="range">Zakres czasu:</label>
      <select id="range" onchange="updateChart()">
        <option value="day">Dzień</option>
        <option value="week">Tydzień</option>
        <option value="month">Miesiąc</option>
      </select>
      <br><br>
      <canvas id="chart" width="400" height="200"></canvas>
      <br>
      <button onclick="generatePDF()">📄 Generuj PDF</button>

      <script>
        const { jsPDF } = window.jspdf;

        const ranges = {
          day: [8, 75, 12, 1],
          week: [40, 380, 80, 3],
          month: [160, 1600, 320, 6]
        };

        let currentRange = 'day';
        let chart;

        function updateChart() {
          currentRange = document.getElementById('range').value;
          const values = ranges[currentRange];
          chart.data.datasets[0].data = values;
          chart.options.plugins.title.text = getTitle();
          chart.update();
        }

        function getTitle() {
          switch(currentRange) {
            case 'day': return 'Dzienny raport';
            case 'week': return 'Tygodniowy raport';
            case 'month': return 'Miesięczny raport';
          }
        }

        const ctx = document.getElementById('chart').getContext('2d');
        chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Godziny pracy', 'm³ drewna', 'Kilometry', 'Awarie'],
            datasets: [{
              label: 'Wartość',
              data: ranges[currentRange],
              backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#f44336']
            }]
          },
          options: {
            responsive: false,
            plugins: {
              legend: { display: false },
              title: { display: true, text: getTitle() }
            }
          }
        });

        function generatePDF() {
          const values = ranges[currentRange];
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Raport – ${machine.name}', 10, 20);
          doc.setFontSize(12);
          doc.text('Operator: ${machine.operator}', 10, 30);
          doc.text('Zakres: ' + getTitle(), 10, 40);
          doc.text('Godziny pracy: ' + values[0], 10, 50);
          doc.text('Pozyskane m³: ' + values[1], 10, 60);
          doc.text('Przejechane km: ' + values[2], 10, 70);
          doc.text('Zgłoszone awarie: ' + values[3], 10, 80);
          doc.save('raport-${machine.name}-' + currentRange + '.pdf');
        }
      </script>
    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

