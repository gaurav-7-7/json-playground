import { render, screen } from '@testing-library/react';
import App from './App';

test('renders JSON Playground navigation links', () => {
  render(<App />);
  const parseLink = screen.getByRole('link', { name: /^parse$/i });
  const compareLink = screen.getByRole('link', { name: /^compare$/i });
  const compileLink = screen.getByRole('link', { name: /^compile$/i });
  const shareLink = screen.getByRole('link', { name: /^share$/i });

  expect(parseLink).toBeInTheDocument();
  expect(compareLink).toBeInTheDocument();
  expect(compileLink).toBeInTheDocument();
  expect(shareLink).toBeInTheDocument();
});
