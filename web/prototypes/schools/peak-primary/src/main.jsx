import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

// Expose them globally since the legacy scripts expect it
window.React = React;
window.ReactDOM = ReactDOM;

// Import the massive monolithic legacy JSX file we just extracted
import './App.jsx';
