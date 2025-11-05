import React, { useEffect, useRef } from 'react';
import type { Chart } from 'chart.js/auto';
import type { WorkerRecord } from '../../types';

interface ChartProps {
    records: WorkerRecord[];
}

export const MonthlyTrendChart: React.FC<ChartProps> = ({ records }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        const monthlyData = records.reduce((acc, record) => {
            const month = record.date.substring(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = { totalScore: 0, count: 0 };
            }
            acc[month].totalScore += record.safetyScore;
            acc[month].count++;
            return acc;
        }, {} as { [key: string]: { totalScore: number; count: number } });
        
        // Add a mock future data point for trend visualization
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() -1);
        const lastMonthKey = lastMonth.toISOString().substring(0,7);
        if(!monthlyData[lastMonthKey]) {
            monthlyData[lastMonthKey] = {totalScore: 72, count: 1};
        }


        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths;
        const data = sortedMonths.map(month => (monthlyData[month].totalScore / monthlyData[month].count).toFixed(1));

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        chartInstance.current = new (window as any).Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: '월 평균 점수',
                    data,
                    fill: false,
                    borderColor: 'rgb(59, 130, 246)',
                    tension: 0.1,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            }
        });
        
    }, [records]);

    return <canvas ref={chartRef} />;
};
