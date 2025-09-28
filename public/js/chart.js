// Chart.js initialization and utility functions for MUBAS Assessment System
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    initializeGradeManagers();
});

// Initialize all charts on the page
function initializeCharts() {
    // Student performance chart
    const studentChart = document.getElementById('studentPerformanceChart');
    if (studentChart) {
        initStudentPerformanceChart(studentChart);
    }

    // Module comparison chart
    const moduleChart = document.getElementById('moduleComparisonChart');
    if (moduleChart) {
        initModuleComparisonChart(moduleChart);
    }

    // Gender performance chart
    const genderChart = document.getElementById('genderPerformanceChart');
    if (genderChart) {
        initGenderPerformanceChart(genderChart);
    }

    // Program statistics chart
    const programChart = document.getElementById('programStatisticsChart');
    if (programChart) {
        initProgramStatisticsChart(programChart);
    }
}

// Initialize student performance chart
function initStudentPerformanceChart(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Sample data - this would be replaced with actual API data
    const chartData = {
        labels: ['DMS-301', 'OPS-302', 'DSA-301', 'WEB-301', 'NET-302', 'SOF-301'],
        datasets: [{
            label: 'Your Scores',
            data: [75, 68, 82, 79, 71, 85],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2
        }, {
            label: 'Class Average',
            data: [65, 62, 70, 68, 66, 72],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Scores (%)'
                    }
                }
            }
        }
    });
}

// Initialize module comparison chart
function initModuleComparisonChart(canvas) {
    const ctx = canvas.getContext('2d');
    
    const chartData = {
        labels: ['BIT Students', 'BIS Students'],
        datasets: [{
            label: 'DMS-301 Average',
            data: [72, 68],
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 2
        }, {
            label: 'OPS-302 Average',
            data: [65, 70],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Average Score (%)'
                    }
                }
            }
        }
    });
}

// Initialize gender performance chart
function initGenderPerformanceChart(canvas) {
    const ctx = canvas.getContext('2d');
    
    const chartData = {
        labels: ['DMS-301', 'OPS-302', 'DSA-301', 'WEB-301'],
        datasets: [{
            label: 'Male Students',
            data: [70, 68, 72, 75],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2
        }, {
            label: 'Female Students',
            data: [73, 71, 75, 78],
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2
        }]
    };

    new Chart(ctx, {
        type: 'radar',
        data: chartData,
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Initialize program statistics chart
function initProgramStatisticsChart(canvas) {
    const ctx = canvas.getContext('2d');
    
    const chartData = {
        labels: ['Distinction (70+)', 'Credit (60-69)', 'Pass (50-59)', 'Fail (<50)'],
        datasets: [{
            data: [25, 40, 25, 10],
            backgroundColor: [
                'rgba(75, 192, 192, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 205, 86, 0.7)',
                'rgba(255, 99, 132, 0.7)'
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 205, 86, 1)',
                'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 2
        }]
    };

    new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Grade management functionality
function initializeGradeManagers() {
    // Auto-calculate final grade when assessment scores change
    const assessmentInputs = document.querySelectorAll('.assessment-score');
    assessmentInputs.forEach(input => {
        input.addEventListener('change', calculateFinalGrade);
    });

    // Initialize grade editing functionality
    initializeGradeEditing();
}

// Calculate final grade based on assessment weights
function calculateFinalGrade() {
    const moduleId = this.dataset.moduleId;
    const assessments = document.querySelectorAll(`[data-module-id="${moduleId}"]`);
    
    let totalScore = 0;
    let totalWeight = 0;
    
    assessments.forEach(input => {
        const score = parseFloat(input.value) || 0;
        const weight = parseFloat(input.dataset.weight) || 0;
        
        totalScore += score * (weight / 100);
        totalWeight += weight;
    });
    
    const finalGrade = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
    
    const finalGradeElement = document.getElementById(`final-grade-${moduleId}`);
    if (finalGradeElement) {
        finalGradeElement.textContent = finalGrade.toFixed(2);
        
        // Color code based on grade
        if (finalGrade >= 70) {
            finalGradeElement.style.color = 'green';
        } else if (finalGrade >= 50) {
            finalGradeElement.style.color = 'orange';
        } else {
            finalGradeElement.style.color = 'red';
        }
    }
}

// Initialize grade editing functionality
function initializeGradeEditing() {
    const editButtons = document.querySelectorAll('.edit-grade-btn');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const gradeId = this.dataset.gradeId;
            enableGradeEditing(gradeId);
        });
    });
}

// Enable grade editing for a specific grade
function enableGradeEditing(gradeId) {
    const gradeElement = document.getElementById(`grade-${gradeId}`);
    const currentScore = gradeElement.textContent;
    
    gradeElement.innerHTML = `
        <input type="number" id="edit-grade-${gradeId}" value="${currentScore}" min="0" max="100" step="0.1" style="width: 80px;">
        <button onclick="saveGrade(${gradeId})" class="btn">Save</button>
        <button onclick="cancelEdit(${gradeId})" class="btn">Cancel</button>
    `;
}

// Save grade changes
function saveGrade(gradeId) {
    const newScore = document.getElementById(`edit-grade-${gradeId}`).value;
    
    // Here you would typically make an API call to save the grade
    fetch('/api/update-grade', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            gradeId: gradeId,
            score: newScore
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the display
            document.getElementById(`grade-${gradeId}`).textContent = newScore;
            showNotification('Grade updated successfully!', 'success');
        } else {
            showNotification('Error updating grade', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error updating grade', 'error');
    });
}

// Cancel grade editing
function cancelEdit(gradeId) {
    // Reload the original grade (in a real app, you might want to store the original value)
    location.reload();
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export data functionality
function exportGradeData(format) {
    const data = {
        student: document.getElementById('studentName')?.textContent || 'Unknown Student',
        grades: []
    };
    
    // Collect grade data (this would be populated from actual data)
    const gradeRows = document.querySelectorAll('.grade-row');
    gradeRows.forEach(row => {
        data.grades.push({
            module: row.cells[0].textContent,
            assessment: row.cells[1].textContent,
            score: row.cells[2].textContent
        });
    });
    
    if (format === 'csv') {
        exportToCSV(data);
    } else if (format === 'pdf') {
        exportToPDF(data);
    }
}

// Export to CSV
function exportToCSV(data) {
    let csvContent = "Module,Assessment,Score\\n";
    
    data.grades.forEach(grade => {
        csvContent += `"${grade.module}","${grade.assessment}","${grade.score}"\\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.student}_grades.csv`;
    a.click();
}

// Export to PDF (simplified - in real app, use a PDF library)
function exportToPDF(data) {
    alert('PDF export would be implemented with a PDF library like jsPDF');
    // This would require additional libraries in a real implementation
}

// Search functionality
function searchStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const rows = document.querySelectorAll('.student-row');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Filter by program
function filterByProgram(program) {
    const rows = document.querySelectorAll('.student-row');
    
    rows.forEach(row => {
        const programCell = row.querySelector('.student-program');
        if (program === 'all' || (programCell && programCell.textContent === program)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}