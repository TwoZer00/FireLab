import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmulatorControls from '../components/EmulatorControls';

const defaults = {
  isRunning: false,
  hasExportData: false,
  importOnStart: false,
  setImportOnStart: vi.fn(),
  autoSnapshot: true,
  setAutoSnapshot: vi.fn(),
  onStart: vi.fn(),
  onStop: vi.fn(),
  emulatorHost: 'http://localhost:4000',
};

describe('EmulatorControls', () => {
  it('shows stopped status when not running', () => {
    render(<EmulatorControls {...defaults} />);
    expect(screen.getByText(/stopped/i)).toBeInTheDocument();
  });

  it('shows running status when running', () => {
    render(<EmulatorControls {...defaults} isRunning={true} />);
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });

  it('Start button disabled when running', () => {
    render(<EmulatorControls {...defaults} isRunning={true} />);
    expect(screen.getByText('Start Emulator')).toBeDisabled();
  });

  it('Stop button disabled when not running', () => {
    render(<EmulatorControls {...defaults} isRunning={false} />);
    expect(screen.getByText('Stop Emulator')).toBeDisabled();
  });

  it('calls onStart when Start clicked', () => {
    const onStart = vi.fn();
    render(<EmulatorControls {...defaults} onStart={onStart} />);
    fireEvent.click(screen.getByText('Start Emulator'));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('calls onStop when Stop clicked', () => {
    const onStop = vi.fn();
    render(<EmulatorControls {...defaults} isRunning={true} onStop={onStop} />);
    fireEvent.click(screen.getByText('Stop Emulator'));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('shows import checkbox only when hasExportData and not running', () => {
    render(<EmulatorControls {...defaults} hasExportData={true} />);
    expect(screen.getByText(/import previous data/i)).toBeInTheDocument();
  });

  it('hides import checkbox when running', () => {
    render(<EmulatorControls {...defaults} hasExportData={true} isRunning={true} />);
    expect(screen.queryByText(/import previous data/i)).not.toBeInTheDocument();
  });

  it('shows Open Emulator UI link when running', () => {
    render(<EmulatorControls {...defaults} isRunning={true} />);
    expect(screen.getByText(/open emulator ui/i)).toBeInTheDocument();
  });

  it('toggles autoSnapshot checkbox', () => {
    const setAutoSnapshot = vi.fn();
    render(<EmulatorControls {...defaults} setAutoSnapshot={setAutoSnapshot} />);
    fireEvent.click(screen.getByLabelText(/auto-snapshot/i));
    expect(setAutoSnapshot).toHaveBeenCalled();
  });
});
