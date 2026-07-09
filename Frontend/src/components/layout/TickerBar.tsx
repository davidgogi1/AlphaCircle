import "./TickerBar.css";

const tickers = [
  { symbol: "AEX", price: "198.56", change: "+1.8%", up: true },
  { symbol: "LVMH", price: "€714.20", change: "-0.9%", up: false },
  { symbol: "NOVO", price: "DKK 845.30", change: "+5.1%", up: true },
  { symbol: "SIEMENS", price: "€178.44", change: "-1.2%", up: false },
  { symbol: "ADYEN", price: "€1,234.00", change: "+2.4%", up: true },
  { symbol: "FERRARI", price: "€412.80", change: "+0.7%", up: true },
  { symbol: "ASML", price: "€762.10", change: "+3.2%", up: true },
  { symbol: "SAP", price: "€182.50", change: "-0.4%", up: false },
];

const Item = ({ symbol, price, change, up }: (typeof tickers)[0]) => (
  <span className="ticker-item">
    <span className="ticker-symbol">{symbol}</span>
    <span className="ticker-price">{price}</span>
    <span className={`ticker-change ${up ? "up" : "down"}`}>
      {up ? "↗" : "↘"}
      {change}
    </span>
  </span>
);

export default function TickerBar() {
  const doubled = [...tickers, ...tickers];
  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {doubled.map((t, i) => (
          <Item key={i} {...t} />
        ))}
      </div>
    </div>
  );
}
