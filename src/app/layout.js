import './globals.css';
export const metadata = {
  title: 'mntis — Read the emotion in a face',
  description:
    'Facial emotion recognition for photos, video and live camera. See the emotion on every face, how positive or negative it reads, and how intense. Free to start.',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="grain">{children}</body>
    </html>
  );
}
