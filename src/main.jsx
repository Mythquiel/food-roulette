import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const initialOptions = [
  'Pizza',
  'Sushi',
  'Ramen',
  'Tacos',
  'Pierogi',
  'Burger',
  'Curry',
  'Sałatka'
];

function App() {
  const [optionsText, setOptionsText] = useState(initialOptions.join('\n'));
  const [result, setResult] = useState('');
  const [spinning, setSpinning] = useState(false);

  const options = useMemo(
    () =>
      optionsText
        .split('\n')
        .map((option) => option.trim())
        .filter(Boolean),
    [optionsText]
  );

  function spin() {
    if (options.length === 0 || spinning) {
      return;
    }

    setSpinning(true);
    setResult('');

    const winner = options[Math.floor(Math.random() * options.length)];

    window.setTimeout(() => {
      setResult(winner);
      setSpinning(false);
    }, 700);
  }

  return (
    <main className="app">
      <section className="intro">
        <p className="eyebrow">Food Roulette</p>
        <h1>Niech los wybierze, co dziś jesz.</h1>
        <p className="lede">Wpisz opcje, zakręć i bez głosowania przejdź do konkretu.</p>
      </section>

      <section className="roulette" aria-label="Losowanie jedzenia">
        <div className={`plate ${spinning ? 'is-spinning' : ''}`}>
          <span>{result || (spinning ? 'Losuję...' : 'Gotowe')}</span>
        </div>

        <button type="button" onClick={spin} disabled={options.length === 0 || spinning}>
          {spinning ? 'Losowanie' : 'Losuj'}
        </button>

        {result && <p className="result">Dzisiaj: {result}</p>}
      </section>

      <label className="options">
        <span>Opcje, po jednej w linii</span>
        <textarea value={optionsText} onChange={(event) => setOptionsText(event.target.value)} />
      </label>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
