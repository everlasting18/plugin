import { useState } from 'react';
import styles from './App.module.css';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';

export default function App() {
  const [activeTab, setActiveTab] = useState('about');

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>CSS Module React - Frontend</h2>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'about' ? styles.active : ''}`}
          onClick={() => setActiveTab('about')}
        >
          Giới thiệu
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'demo' ? styles.active : ''}`}
          onClick={() => setActiveTab('demo')}
        >
          Demo
        </button>
      </div>

      {activeTab === 'about' && (
        <Card title="React + CSS Modules trong WordPress">
          <p>
            Component này được render qua shortcode <code>[css_module_react]</code>.
            CSS hoàn toàn isolated, không ảnh hưởng đến theme.
          </p>
        </Card>
      )}

      {activeTab === 'demo' && (
        <Card title="Buttons Demo">
          <div className={styles.buttonGroup}>
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
