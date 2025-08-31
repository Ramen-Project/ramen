import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';

interface DataTableProps {
  data: any[];
  pageSize?: number;
  searchable?: boolean;
  onFilterChange?: (filteredData: any[]) => void;
  onSelectionChange?: (selectedRows: number[]) => void;
  onNodeEvent?: (event: string, data: any) => void;
}

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  width: 100%;
`;

const SearchInput = styled.input`
  width: 100%;
  max-width: 300px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 16px;
  
  &:focus {
    outline: none;
    border-color: #4CAF50;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const TableHeader = styled.thead`
  background: #f5f5f5;
`;

const TableRow = styled.tr<{ selected?: boolean }>`
  background: ${props => props.selected ? '#e3f2fd' : 'transparent'};
  cursor: pointer;
  
  &:hover {
    background: ${props => props.selected ? '#bbdefb' : '#f9f9f9'};
  }
`;

const TableCell = styled.td`
  padding: 12px 8px;
  border-bottom: 1px solid #eee;
  text-align: left;
`;

const TableHeaderCell = styled.th`
  padding: 12px 8px;
  border-bottom: 2px solid #ddd;
  text-align: left;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  
  &:hover {
    background: #eeeeee;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  font-size: 14px;
`;

const PaginationButton = styled.button<{ disabled?: boolean }>`
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: ${props => props.disabled ? '#f5f5f5' : 'white'};
  color: ${props => props.disabled ? '#999' : '#333'};
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  margin: 0 2px;
  
  &:hover:not(:disabled) {
    background: #f0f0f0;
  }
`;

const SelectionSummary = styled.div`
  margin-top: 16px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 4px;
  border: 1px solid #e0e8f0;
  font-size: 14px;
`;

const InteractiveDataTable: React.FC<DataTableProps> = ({
  data,
  pageSize = 20,
  searchable = true,
  onFilterChange,
  onSelectionChange,
  onNodeEvent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Get column names
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    const filtered = data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    
    // Notify parent of filter change
    if (onFilterChange) {
      onFilterChange(filtered);
    }
    
    return filtered;
  }, [data, searchTerm, onFilterChange]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue === bValue) return 0;
      
      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
    setSelectedRows(new Set()); // Clear selection
  }, []);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const handleRowSelection = useCallback((rowIndex: number, row: any) => {
    const newSelectedRows = new Set(selectedRows);
    
    if (selectedRows.has(rowIndex)) {
      newSelectedRows.delete(rowIndex);
    } else {
      newSelectedRows.add(rowIndex);
    }
    
    setSelectedRows(newSelectedRows);
    
    const selectedIndices = Array.from(newSelectedRows);
    
    // Notify parent
    if (onSelectionChange) {
      onSelectionChange(selectedIndices);
    }
    
    // Send event to node
    if (onNodeEvent) {
      onNodeEvent('row_selection', {
        selected_indices: selectedIndices,
        selected_data: selectedIndices.map(idx => sortedData[idx]),
        clicked_row: row
      });
    }
  }, [selectedRows, onSelectionChange, onNodeEvent, sortedData]);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  if (!data || data.length === 0) {
    return (
      <TableContainer>
        <p>No data to display</p>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
          Interactive Data Table
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {searchable && (
            <SearchInput
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          )}
          <span style={{ color: '#666', fontSize: '14px' }}>
            Showing {paginatedData.length} of {sortedData.length} rows
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <tr>
            {columns.map(column => (
              <TableHeaderCell
                key={column}
                onClick={() => handleSort(column)}
              >
                {column}
                {sortColumn === column && (
                  <span style={{ marginLeft: '4px' }}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHeaderCell>
            ))}
          </tr>
        </TableHeader>
        <tbody>
          {paginatedData.map((row, index) => {
            const actualIndex = (currentPage - 1) * pageSize + index;
            const isSelected = selectedRows.has(actualIndex);
            
            return (
              <TableRow
                key={actualIndex}
                selected={isSelected}
                onClick={() => handleRowSelection(actualIndex, row)}
              >
                {columns.map(column => (
                  <TableCell key={column}>
                    {typeof row[column] === 'object' 
                      ? JSON.stringify(row[column])
                      : String(row[column])
                    }
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </tbody>
      </Table>

      <Pagination>
        <div>
          <PaginationButton
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </PaginationButton>
          <span style={{ margin: '0 16px' }}>
            Page {currentPage} of {totalPages}
          </span>
          <PaginationButton
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </PaginationButton>
        </div>
        <div>
          Page size: {pageSize}
        </div>
      </Pagination>

      {selectedRows.size > 0 && (
        <SelectionSummary>
          <strong>Selection Summary:</strong>
          <div style={{ marginTop: '8px' }}>
            {selectedRows.size} rows selected out of {sortedData.length} total rows
          </div>
        </SelectionSummary>
      )}
    </TableContainer>
  );
};

export default InteractiveDataTable;