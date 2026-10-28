import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SnapshotsManager from '../components/SnapshotsManager';

const getHeaders = () => ({ Authorization: 'Bearer test' });

const defaults = {
  projectId: 'test-proj',
  snapshots: [],
  onExport: vi.fn(),
  onRestore: vi.fn(),
  onDelete: vi.fn(),
  onRefresh: vi.fn(),
  isRunning: true,
  getHeaders,
};

describe('SnapshotsManager', () => {
  it('shows empty state when no snapshots', () => {
    render(<SnapshotsManager {...defaults} />);
    expect(screen.getByText(/no snapshots yet/i)).toBeInTheDocument();
  });

  it('renders snapshot list', () => {
    render(<SnapshotsManager {...defaults} snapshots={['snap-1', 'auto-2024']} />);
    expect(screen.getByText('snap-1')).toBeInTheDocument();
    expect(screen.getByText('auto-2024')).toBeInTheDocument();
  });

  it('shows count when snapshots exist', () => {
    render(<SnapshotsManager {...defaults} snapshots={['a', 'b', 'c']} />);
    expect(screen.getByText(/3 snapshots/i)).toBeInTheDocument();
  });

  it('Create Snapshot button disabled when not running', () => {
    render(<SnapshotsManager {...defaults} isRunning={false} />);
    expect(screen.getByRole('button', { name: /create snapshot/i })).toBeDisabled();
  });

  it('shows name input after clicking Create Snapshot', () => {
    render(<SnapshotsManager {...defaults} />);
    fireEvent.click(screen.getByText(/create snapshot/i));
    expect(screen.getByPlaceholderText(/snapshot name/i)).toBeInTheDocument();
  });

  it('calls onExport with name when Create clicked in input mode', () => {
    const onExport = vi.fn();
    render(<SnapshotsManager {...defaults} onExport={onExport} />);
    fireEvent.click(screen.getByText(/create snapshot/i));
    fireEvent.change(screen.getByPlaceholderText(/snapshot name/i), { target: { value: 'my-snap' } });
    fireEvent.click(screen.getByText('Create'));
    expect(onExport).toHaveBeenCalledWith('my-snap');
  });

  it('calls onRestore when Restore clicked', () => {
    const onRestore = vi.fn();
    render(<SnapshotsManager {...defaults} snapshots={['snap-1']} onRestore={onRestore} />);
    fireEvent.click(screen.getByTitle(/restore/i));
    expect(onRestore).toHaveBeenCalledWith('snap-1');
  });

  it('calls onDelete when Delete clicked', () => {
    const onDelete = vi.fn();
    render(<SnapshotsManager {...defaults} snapshots={['snap-1']} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle(/delete/i));
    expect(onDelete).toHaveBeenCalledWith('snap-1');
  });

  it('shows 🔒 for pre-seed snapshot', () => {
    render(<SnapshotsManager {...defaults} snapshots={['pre-seed']} />);
    expect(screen.getByText(/🔒/)).toBeInTheDocument();
  });

  it('shows hint when emulator not running', () => {
    render(<SnapshotsManager {...defaults} isRunning={false} />);
    expect(screen.getByText(/start emulator to create/i)).toBeInTheDocument();
  });

  describe('Upload', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    });
    afterEach(() => { vi.restoreAllMocks(); });

    it('calls onRefresh after successful upload', async () => {
      const onRefresh = vi.fn();
      render(<SnapshotsManager {...defaults} onRefresh={onRefresh} />);
      const input = document.querySelector('input[type="file"]');
      const file = new File(['zip content'], 'my-snapshot.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    });

    it('shows alert on upload failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Upload failed' }) });
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<SnapshotsManager {...defaults} />);
      const input = document.querySelector('input[type="file"]');
      const file = new File(['zip'], 'bad.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Upload failed')));
    });
  });
});
