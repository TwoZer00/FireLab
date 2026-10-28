import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectSetup from '../components/ProjectSetup';

const defaults = {
  projectId: '',
  existingProjects: ['demo-project', 'test'],
  runningProjects: new Set(),
  onSelectProject: vi.fn(),
  onCreateProject: vi.fn(),
};

describe('ProjectSetup', () => {
  it('renders existing projects in dropdown', () => {
    render(<ProjectSetup {...defaults} />);
    expect(screen.getByRole('option', { name: 'demo-project' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test' })).toBeInTheDocument();
  });

  it('calls onSelectProject when a project is selected', () => {
    const onSelectProject = vi.fn();
    render(<ProjectSetup {...defaults} onSelectProject={onSelectProject} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'demo-project' } });
    expect(onSelectProject).toHaveBeenCalledWith('demo-project');
  });

  it('shows create form when "+ Create New Project" selected', () => {
    render(<ProjectSetup {...defaults} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } });
    expect(screen.getByPlaceholderText(/enter project name/i)).toBeInTheDocument();
  });

  it('shows sanitized ID preview while typing', () => {
    render(<ProjectSetup {...defaults} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } });
    fireEvent.change(screen.getByPlaceholderText(/enter project name/i), { target: { value: 'My Project!' } });
    expect(screen.getByText(/my-project/i)).toBeInTheDocument();
  });

  it('shows error when creating duplicate project name', () => {
    render(<ProjectSetup {...defaults} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } });
    fireEvent.change(screen.getByPlaceholderText(/enter project name/i), { target: { value: 'demo-project' } });
    fireEvent.click(screen.getByText('Create'));
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });

  it('shows error when creating with empty name', () => {
    render(<ProjectSetup {...defaults} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } });
    fireEvent.click(screen.getByText('Create'));
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it('calls onCreateProject with sanitized name and services', () => {
    const onCreateProject = vi.fn();
    render(<ProjectSetup {...defaults} onCreateProject={onCreateProject} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } });
    fireEvent.change(screen.getByPlaceholderText(/enter project name/i), { target: { value: 'my new project' } });
    fireEvent.click(screen.getByText('Create'));
    expect(onCreateProject).toHaveBeenCalledWith('my-new-project', expect.any(Object));
  });

  it('shows 🟢 indicator for running projects', () => {
    render(<ProjectSetup {...defaults} runningProjects={new Set(['demo-project'])} />);
    const option = screen.getByRole('option', { name: /demo-project/ });
    expect(option.textContent).toContain('🟢');
  });

  it('cancel button hides create form', () => {
    render(<ProjectSetup {...defaults} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__create_new__' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText(/enter project name/i)).not.toBeInTheDocument();
  });
});
