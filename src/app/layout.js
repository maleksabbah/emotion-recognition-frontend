import './globals.css';

export const metadata = {
  title: 'FEELER — Multi-Stream Facial Emotion Recognition',
  description: 'Real-time facial emotion recognition powered by transformer fusion across face regions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="grain">{children}</body>
    </html>
  );
}
