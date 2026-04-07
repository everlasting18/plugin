import { createRoot } from 'react-dom/client';
import CalendarApp from './CalendarApp.jsx';

const root = document.getElementById('contentai-calendar-root');
if (root) {
  createRoot(root).render(<CalendarApp />);
}
