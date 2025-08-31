import React, { useState, useCallback, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';

interface DataPoint {
  [key: string]: any;
}

interface InteractiveScatterPlotProps {
  data: DataPoint[];
  xColumn: string;
  yColumn: string;
  colorColumn?: string;
  sizeColumn?: string;
  width?: number;
  height?: number;
  onSelectionChange?: (selectedData: DataPoint[]) => void;
  onNodeEvent?: (event: string, data: any) => void;
}

const InteractiveScatterPlot: React.FC<InteractiveScatterPlotProps> = ({
  data,
  xColumn,
  yColumn,
  colorColumn,
  sizeColumn,
  width = 800,
  height = 600,
  onSelectionChange,
  onNodeEvent
}) => {
  const [selectedPoints, setSelectedPoints] = useState<DataPoint[]>([]);
  const [brushData, setBrushData] = useState<{startIndex: number, endIndex: number} | null>(null);

  // Process data for chart
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      x: item[xColumn],
      y: item[yColumn],
      color: colorColumn ? item[colorColumn] : 'default',
      size: sizeColumn ? item[sizeColumn] : 5,
      originalIndex: index
    }));
  }, [data, xColumn, yColumn, colorColumn, sizeColumn]);

  // Group data by color column if specified
  const groupedData = useMemo(() => {
    if (!colorColumn) {
      return { default: chartData };
    }

    return chartData.reduce((groups, item) => {
      const group = item.color || 'undefined';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {} as { [key: string]: typeof chartData });
  }, [chartData, colorColumn]);

  // Color palette
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', 
    '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'
  ];

  const handlePointClick = useCallback((data: any, event: any) => {
    console.log('Point clicked:', data);
    
    // Toggle point selection
    const isSelected = selectedPoints.some(p => p.originalIndex === data.originalIndex);
    let newSelection: DataPoint[];
    
    if (isSelected) {
      newSelection = selectedPoints.filter(p => p.originalIndex !== data.originalIndex);
    } else {
      newSelection = [...selectedPoints, data];
    }
    
    setSelectedPoints(newSelection);
    
    // Notify parent component
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
    
    // Send event to node
    if (onNodeEvent) {
      onNodeEvent('point_selection', {
        selected_points: newSelection,
        clicked_point: data
      });
    }
  }, [selectedPoints, onSelectionChange, onNodeEvent]);

  const handleBrushChange = useCallback((brushData: any) => {
    if (brushData) {
      setBrushData(brushData);
      
      // Get points in brush range
      const startIndex = brushData.startIndex || 0;
      const endIndex = brushData.endIndex || chartData.length - 1;
      const brushedData = chartData.slice(startIndex, endIndex + 1);
      
      if (onNodeEvent) {
        onNodeEvent('brush_selection', {
          brushed_data: brushedData,
          range: { startIndex, endIndex }
        });
      }
    }
  }, [chartData, onNodeEvent]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p><strong>{`${xColumn}: ${data.x}`}</strong></p>
          <p><strong>{`${yColumn}: ${data.y}`}</strong></p>
          {colorColumn && <p>{`${colorColumn}: ${data.color}`}</p>}
          {sizeColumn && <p>{`${sizeColumn}: ${data.size}`}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      minHeight: height,
      background: 'white',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#333' }}>
          Interactive Scatter Plot
        </h3>
        <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
          Click points to select • {selectedPoints.length} points selected
        </p>
      </div>

      <ResponsiveContainer width="100%" height={height - 80}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="x" 
            name={xColumn}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
            dataKey="y" 
            name={yColumn}
            type="number"
            domain={['dataMin', 'dataMax']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {Object.entries(groupedData).map(([group, groupData], index) => (
            <Scatter
              key={group}
              name={group}
              data={groupData}
              fill={colors[index % colors.length]}
              onClick={handlePointClick}
              style={{ cursor: 'pointer' }}
            />
          ))}

          <Brush
            dataKey="x"
            height={30}
            stroke="#8884d8"
            onChange={handleBrushChange}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {selectedPoints.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f0f8ff',
          borderRadius: '4px',
          border: '1px solid #e0e8f0'
        }}>
          <strong>Selected Points Summary:</strong>
          <div style={{ marginTop: '8px', fontSize: '14px' }}>
            Count: {selectedPoints.length} | 
            Avg {xColumn}: {(selectedPoints.reduce((sum, p) => sum + p.x, 0) / selectedPoints.length).toFixed(2)} | 
            Avg {yColumn}: {(selectedPoints.reduce((sum, p) => sum + p.y, 0) / selectedPoints.length).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveScatterPlot;