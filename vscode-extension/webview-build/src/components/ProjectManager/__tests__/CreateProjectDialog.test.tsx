/**
 * 創建專案對話框測試
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProjectDialog } from '../CreateProjectDialog';

describe('CreateProjectDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  it('應該渲染對話框', () => {
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Project Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('應該處理用戶輸入', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Project Name *');
    const descriptionInput = screen.getByLabelText('Description');

    await user.type(nameInput, '測試專案');
    await user.type(descriptionInput, '這是一個測試專案');

    expect(nameInput).toHaveValue('測試專案');
    expect(descriptionInput).toHaveValue('這是一個測試專案');
  });

  it('應該驗證專案名稱不能為空', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const createButton = screen.getByText('Create Project');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('應該驗證專案名稱長度', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Project Name *');
    await user.type(nameInput, 'a'); // 只有一個字符

    const createButton = screen.getByText('Create Project');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Project name must be at least 2 characters long')).toBeInTheDocument();
    });
  });

  it('應該驗證專案名稱不包含無效字符', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Project Name *');
    await user.type(nameInput, 'test<>project'); // 包含無效字符

    const createButton = screen.getByText('Create Project');
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Project name contains invalid characters')).toBeInTheDocument();
    });
  });

  it('應該在有效輸入時調用 onConfirm', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Project Name *');
    const descriptionInput = screen.getByLabelText('Description');

    await user.type(nameInput, '測試專案');
    await user.type(descriptionInput, '測試描述');

    const createButton = screen.getByText('Create Project');
    await user.click(createButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('測試專案', '測試描述');
    });
  });

  it('應該在取消時調用 onCancel', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('應該在載入時禁用按鈕', () => {
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByText('Creating...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('應該在點擊遮罩時關閉對話框', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // 點擊遮罩（對話框外部）
    const overlay = screen.getByTestId('dialog-overlay');
    await user.click(overlay);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('應該支持鍵盤提交', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Project Name *');
    await user.type(nameInput, '測試專案{enter}');

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('測試專案', undefined);
    });
  });

  it('應該修剪輸入的空白字符', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Project Name *');
    const descriptionInput = screen.getByLabelText('Description');

    await user.type(nameInput, '  測試專案  ');
    await user.type(descriptionInput, '  測試描述  ');

    const createButton = screen.getByText('Create Project');
    await user.click(createButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('測試專案', '測試描述');
    });
  });

  it('應該處理空的描述', async () => {
    const user = userEvent.setup();
    
    render(
      <CreateProjectDialog
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Project Name *');
    await user.type(nameInput, '測試專案');

    const createButton = screen.getByText('Create Project');
    await user.click(createButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('測試專案', undefined);
    });
  });
});