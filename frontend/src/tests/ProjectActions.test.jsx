import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectActions from '../components/ProjectActions';

const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer test' });

const defaults = {
  projectId: 'my-project',
  getHeaders,
  onRenamed: vi.fn(),
};

describe('ProjectActions', () => {
  it('renders nothing when no projectId', () => {
    const { container } = render(<ProjectActions {...defaults} projectId="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for __create_new__', () => {
    const { container } = render(<ProjectActions {...defaults} projectId="__create_new__" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows Rename and Delete buttons', () => {
    render(<ProjectActions {...defaults} />);
    expect(screen.getByText(/rename project/i)).toBeInTheDocument();
    expect(screen.getByText(/delete project/i)).toBeInTheDocument();
  });

  describe('Rename', () => {
    it('shows input with current name when Rename clicked', () => {
      render(<ProjectActions {...defaults} />);
      fireEvent.click(screen.getByText(/rename project/i));
      expect(screen.getByPlaceholderText(/new project name/i)).toHaveValue('my-project');
    });

    it('shows sanitized ID preview', () => {
      render(<ProjectActions {...defaults} />);
      fireEvent.click(screen.getByText(/rename project/i));
      fireEvent.change(screen.getByPlaceholderText(/new project name/i), { target: { value: 'New Name!' } });
      expect(screen.getByText(/new-name/)).toBeInTheDocument();
    });

    it('cancel hides the input', () => {
      render(<ProjectActions {...defaults} />);
      fireEvent.click(screen.getByText(/rename project/i));
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByPlaceholderText(/new project name/i)).not.toBeInTheDocument();
    });

    it('calls onRenamed with new name on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, newName: 'new-name' }) });
      const onRenamed = vi.fn();
      render(<ProjectActions {...defaults} onRenamed={onRenamed} />);
      fireEvent.click(screen.getByText(/rename project/i));
      fireEvent.change(screen.getByPlaceholderText(/new project name/i), { target: { value: 'new name' } });
      fireEvent.click(screen.getByText('Rename'));
      await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('new-name'));
    });

    it('shows backend error on failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'A project with that name already exists' }) });
      render(<ProjectActions {...defaults} />);
      fireEvent.click(screen.getByText(/rename project/i));
      fireEvent.change(screen.getByPlaceholderText(/new project name/i), { target: { value: 'test' } });
      fireEvent.click(screen.getByText('Rename'));
      await waitFor(() => expect(screen.getByText(/already exists/i)).toBeInTheDocument());
    });

    it('Rename button disabled when input is empty', () => {
      render(<ProjectActions {...defaults} />);
      fireEvent.click(screen.getByText(/rename project/i));
      fireEvent.change(screen.getByPlaceholderText(/new project name/i), { target: { value: '' } });
      expect(screen.getByText('Rename')).toBeDisabled();
    });
  });

  describe('Delete', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      Object.defineProperty(window, 'location', { value: { reload: vi.fn() }, writable: true });
    });
    afterEach(() => vi.restoreAllMocks());

    it('calls DELETE endpoint on confirm', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      render(<ProjectActions {...defaults} />);
      fireEvent.click(screen.getByText(/delete project/i));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/my-project'),
        expect.objectContaining({ method: 'DELETE' })
      ));
    });

    it('does not call fetch when confirm cancelled', async () => {
      window.confirm.mockReturnValue(false);
      global.fetch = vi.fn();
      render(<ProjectActions {...defaults} />);
      fireEvent.click(screen.getByText(/delete project/i));
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
