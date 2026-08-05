import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.React = React;
window.ReactDOM = ReactDOM;

// --- Auto-extracted legacy Babel scripts ---
import '../role-router.jsx';
import '../teacher-view.jsx';
import '../head-staff-panel.jsx';
import '../head-timetable-panel.jsx';
import './v4-peak-dark.jsx';
import './v4-today.jsx';
import './v4-students.jsx';
import './v4-profile.jsx';
import './v4-fees.jsx';
import './v4-broadcast.jsx';
import './v4-mobile.jsx';
import './nia-feed.jsx';
// ------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
