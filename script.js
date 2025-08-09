const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const daySelect = document.getElementById('daySelect');
days.forEach(d=>{
  let opt = document.createElement('option');
  opt.value = d;
  opt.textContent = d;
  daySelect.appendChild(opt);
});

// Load saved data or init empty
let roadmapData = JSON.parse(localStorage.getItem('roadmapData')) || [];
let timetableData = JSON.parse(localStorage.getItem('timetableData')) || {};

// Initialize timetableData structure if empty
days.forEach(day => {
  if (!timetableData[day]) timetableData[day] = {};
});

// Undo stack for timetable changes
let undoStack = [];
const undoBtn = document.getElementById('undoBtn');

function updateUndoBtn() {
  undoBtn.disabled = undoStack.length === 0;
}

// ROADMAP

const roadmapList = document.getElementById('roadmapList');

document.getElementById('addRoadmap').addEventListener('click', ()=>{
  const title = document.getElementById('roadmapTitle').value.trim();
  const desc = document.getElementById('roadmapDesc').value.trim();
  const date = document.getElementById('roadmapDate').value;
  if(!title || !desc || !date) return alert('Please fill all fields');

  roadmapData.push({title, desc, date});
  saveRoadmap();
  renderRoadmap();

  // clear inputs
  document.getElementById('roadmapTitle').value = '';
  document.getElementById('roadmapDesc').value = '';
  document.getElementById('roadmapDate').value = '';
});

function renderRoadmap(){
  roadmapList.innerHTML = '';
  roadmapData.forEach((item, idx)=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong style="color:white">${item.title}</strong> - ${item.date}<br>${item.desc}</div><button onclick="removeRoadmap(${idx})">Delete</button>`;
    roadmapList.appendChild(li);
  });
}
function removeRoadmap(index){
  roadmapData.splice(index,1);
  saveRoadmap();
  renderRoadmap();
}
function saveRoadmap(){
  localStorage.setItem('roadmapData', JSON.stringify(roadmapData));
}

// TIMETABLE

const timetableHead = document.getElementById('timetableHead');
const timetableBody = document.getElementById('timetableBody');

function format12Hour(hour) {
  if (hour === 12) return '12:00 PM';      // Noon
  let period = hour > 12 ? 'PM' : 'AM';
  let adjusted = hour % 12 || 12;
  return adjusted + ':00 ' + period;
}

function initTimetable(){
  timetableHead.innerHTML = '';
  timetableBody.innerHTML = '';
  const headRow = document.createElement('tr');
  const emptyTh = document.createElement('th');
  emptyTh.textContent = 'Day/Time';
  headRow.appendChild(emptyTh);

  // Hours order without 0 (midnight):
  // 1-11 AM, 13-23 PM, 12 PM last
  const hoursOrder = [...Array(11).keys()].map(i => i + 1)  // 1 to 11
    .concat([...Array(11).keys()].map(i => i + 13))          // 13 to 23
    .concat([12]);                                           // 12 last

  hoursOrder.forEach(hour => {
    const th = document.createElement('th');
    th.textContent = format12Hour(hour);
    headRow.appendChild(th);
  });
  timetableHead.appendChild(headRow);

  days.forEach(day=>{
    const row = document.createElement('tr');
    const dayCell = document.createElement('td');
    dayCell.textContent = day;
    row.appendChild(dayCell);

    hoursOrder.forEach(hour => {
      const timeKey = String(hour).padStart(2,'0') + ':00';
      const td = document.createElement('td');
      td.textContent = timetableData[day][timeKey] || '';
      row.appendChild(td);
    });

    timetableBody.appendChild(row);
  });
}

initTimetable();

document.getElementById('addTimetable').addEventListener('click', ()=>{
  const subject = document.getElementById('timeSubject').value.trim();
  const timeSlot = document.getElementById('timeSlot').value;
  const day = document.getElementById('daySelect').value;
  if(!subject || !timeSlot || !day) return alert('Please fill all fields');

  const hourKey = timeSlot.split(':')[0] + ':00';

  // Save state before change for undo
  pushUndo();

  timetableData[day][hourKey] = subject;
  saveTimetable();
  initTimetable();

  // Clear inputs
  document.getElementById('timeSubject').value = '';
  document.getElementById('timeSlot').value = '';
  document.getElementById('daySelect').selectedIndex = 0;
});

function saveTimetable(){
  localStorage.setItem('timetableData', JSON.stringify(timetableData));
}

// Undo management
function pushUndo(){
  // Deep clone current timetableData for undo stack
  undoStack.push(JSON.parse(JSON.stringify(timetableData)));
  // Limit undo stack size to last 20 actions
  if(undoStack.length > 20) undoStack.shift();
  updateUndoBtn();
}

undoBtn.addEventListener('click', ()=>{
  if(undoStack.length === 0) return;

  // Pop last state and restore timetableData
  timetableData = undoStack.pop();
  saveTimetable();
  initTimetable();
  updateUndoBtn();
});

// Remake timetable (clear all timetable entries)
document.getElementById('remakeBtn').addEventListener('click', ()=>{
  if(confirm('Are you sure you want to remake (clear) the entire timetable? This cannot be undone.')){
    // Push current state to undo stack first
    pushUndo();

    // Clear timetableData
    timetableData = {};
    days.forEach(day => timetableData[day] = {});
    saveTimetable();
    initTimetable();
  }
});

// Download timetable as PNG image
async function downloadTimetableAsImage(){
  try{
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const wrapper = document.getElementById('timetableWrapper');
    const computedBg = window.getComputedStyle(wrapper).backgroundColor || '#071428';

    const canvas = await html2canvas(wrapper, {
      backgroundColor: computedBg,
      useCORS: true,
      allowTaint: true,
      scale: window.devicePixelRatio || 2,
      logging: false
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'weekly_timetable.png';
    link.click();
  }catch(err){
    console.error(err);
    alert('Image export failed — check console for details.');
  }
}

document.getElementById('downloadTimetable').addEventListener('click', downloadTimetableAsImage);

// Render roadmap and timetable on load
renderRoadmap();
initTimetable();
updateUndoBtn();
