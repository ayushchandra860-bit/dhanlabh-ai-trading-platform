import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import OverlayV6 from './pages/OverlayV6';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/overlay" element={<OverlayV6 />} />
        <Route path="*" element={<OverlayV6 />} />
      </Routes>
    </HashRouter>
  );
}