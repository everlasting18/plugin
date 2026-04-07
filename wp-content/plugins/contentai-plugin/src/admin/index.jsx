import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp.jsx';

const root = document.getElementById('contentai-admin-root');
if (root) {
  createRoot(root).render(<AdminApp />);
}
