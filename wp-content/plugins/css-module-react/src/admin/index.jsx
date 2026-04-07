import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('css-module-react-admin');
if (container) {
  createRoot(container).render(<App />);
}
