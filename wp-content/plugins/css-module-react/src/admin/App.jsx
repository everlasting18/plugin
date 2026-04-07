import { useState } from 'react';
import styles from './App.module.css';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>CSS Module React - Admin</h1>
      <p className={styles.description}>
        Plugin demo React + CSS Modules trong WordPress Admin.
        <br />
        Mỗi class name được hash tự động để tránh xung đột.
      </p>

      <div className={styles.grid}>
        <Card title="Counter Demo">
          <p>Đếm: <strong>{count}</strong></p>
          <div className={styles.buttonGroup}>
            <Button onClick={() => setCount(c => c + 1)}>Tăng +1</Button>
            <Button variant="secondary" onClick={() => setCount(0)}>Reset</Button>
            <Button variant="danger" onClick={() => setCount(c => c - 1)}>Giảm -1</Button>
          </div>
        </Card>

        <Card title="CSS Modules là gì?">
          <p>
            CSS Modules tự động tạo class name unique cho mỗi component.
            Ví dụ: <code>.container</code> → <code>App_container_x7d2k</code>
          </p>
          <p>Inspect element để xem class name đã được hash!</p>
        </Card>

        <Card title="Lợi ích">
          <ul className={styles.list}>
            <li>Không xung đột CSS với theme/plugin khác</li>
            <li>Scope CSS theo component</li>
            <li>Dễ bảo trì, dễ refactor</li>
            <li>Hỗ trợ sẵn bởi Vite</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
