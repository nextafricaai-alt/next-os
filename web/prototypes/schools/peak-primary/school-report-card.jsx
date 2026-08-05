import React from 'react';
(function () {
  const { React, SchoolDocumentHeader } = window;
  const { useState } = React || { useState: function(){} };

  const DEFAULT_BRAND = {
    colors: { primary: "#1e3a8a", secondary: "#f59e0b", accent: "#3b82f6" },
    motto: "Striving for Excellence"
  };
  const getBrand = () => window.SCHOOL_BRAND || DEFAULT_BRAND;

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': case 'A+': return '#10b981'; // green
      case 'B': return '#3b82f6'; // blue
      case 'C': return '#f59e0b'; // amber
      case 'D': return '#f97316'; // orange
      case 'E': case 'F': return '#ef4444'; // red
      default: return '#6b7280';
    }
  };

  const SchoolReportCard = ({
    student,
    term,
    year,
    subjects,
    attendance,
    classTeacherRemarks,
    headTeacherComment,
    nextTermStart,
    classTeacherName,
    headTeacherName,
  }) => {
    const brand = getBrand();

    // Toolbar for interactions
    const handlePrint = () => window.print();
    const handleShare = () => {
      const text = `Report Card for ${student.name} (${student.class}) - ${term} ${year}.`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    };

    const totalMarks = subjects.reduce((sum, s) => sum + s.marks, 0);
    const possibleMarks = subjects.reduce((sum, s) => sum + s.outOf, 0);
    const average = subjects.length > 0 ? (totalMarks / subjects.length).toFixed(1) : 0;
    const overallGrade = average >= 80 ? 'A' : average >= 70 ? 'B' : average >= 60 ? 'C' : average >= 50 ? 'D' : 'F';

    return (
      <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif', position: 'relative' }}>
        
        {/* Toolbar - hidden on print */}
        <div className="no-print" style={{ display: 'flex', gap: '8px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px', marginBottom: '24px', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint} style={{ padding: '8px 16px', background: brand.colors.primary, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>🖨️ Print / PDF</button>
          <button onClick={handleShare} style={{ padding: '8px 16px', background: '#25D366', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>💬 Share WhatsApp</button>
        </div>

        {/* A4 Print Container */}
        <div className="document-print-area" style={{ background: 'white', padding: '40px', boxSizing: 'border-box', minHeight: '1122px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
          {SchoolDocumentHeader ? <SchoolDocumentHeader docType="TERM REPORT" /> : <div>Missing SchoolDocumentHeader component</div>}
          
          {/* Student Info Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#f9fafb', padding: '12px 20px', borderRadius: '8px', marginTop: '24px', border: '1px solid #e5e7eb' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Student Name</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>{student.name} <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 'normal' }}>(#{student.admissionNo})</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Class & Term</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: brand.colors.primary }}>{student.class} {student.stream} | {term} {year}</div>
            </div>
          </div>

          {/* Subjects Table */}
          <div style={{ marginTop: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: brand.colors.primary, color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'center', width: '50px' }}>No.</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Subject</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Marks</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Out Of</th>
                  <th style={{ padding: '12px', textAlign: 'center', width: '80px' }}>Grade</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{sub.name}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{sub.marks}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>{sub.outOf}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: getGradeColor(sub.grade), color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: 12, fontWeight: 'bold' }}>{sub.grade}</span>
                    </td>
                    <td style={{ padding: '12px', fontStyle: 'italic', color: '#4b5563' }}>{sub.remarks}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ padding: '12px', textAlign: 'right' }}>TOTAL / AVERAGE</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: brand.colors.primary }}>{totalMarks}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{possibleMarks}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{average}%</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Performance & Attendance */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
            <div style={{ flex: 1, border: `1px solid ${brand.colors.secondary}`, borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: brand.colors.secondary, color: 'white', padding: '8px 12px', fontSize: 12, fontWeight: 'bold', letterSpacing: '0.05em' }}>PERFORMANCE SUMMARY</div>
              <div style={{ display: 'flex', padding: '16px', justifyContent: 'space-around', textAlign: 'center' }}>
                <div><div style={{ fontSize: 24, fontWeight: 'bold', color: brand.colors.primary }}>{totalMarks}</div><div style={{ fontSize: 11, color: '#6b7280' }}>AGGREGATE</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 'bold', color: getGradeColor(overallGrade) }}>{overallGrade}</div><div style={{ fontSize: 11, color: '#6b7280' }}>GRADE</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 'bold' }}>5</div><div style={{ fontSize: 11, color: '#6b7280' }}>POSITION</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 'bold' }}>42</div><div style={{ fontSize: 11, color: '#6b7280' }}>OUT OF</div></div>
              </div>
            </div>

            <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#e5e7eb', color: '#4b5563', padding: '8px 12px', fontSize: 12, fontWeight: 'bold', letterSpacing: '0.05em' }}>ATTENDANCE</div>
              <div style={{ display: 'flex', padding: '16px', justifyContent: 'space-around', textAlign: 'center' }}>
                <div><div style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>{attendance.present}</div><div style={{ fontSize: 11, color: '#6b7280' }}>PRESENT</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444' }}>{attendance.absent}</div><div style={{ fontSize: 11, color: '#6b7280' }}>ABSENT</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>{attendance.late}</div><div style={{ fontSize: 11, color: '#6b7280' }}>LATE</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 'bold', color: brand.colors.primary }}>{Math.round(attendance.present / attendance.total * 100)}%</div><div style={{ fontSize: 11, color: '#6b7280' }}>RATE</div></div>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div style={{ display: 'flex', gap: '40px', marginTop: '32px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: brand.colors.secondary, fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Class Teacher's Remarks</div>
              <div style={{ fontStyle: 'italic', color: '#374151', minHeight: '60px' }}>"{classTeacherRemarks}"</div>
              <div style={{ marginTop: '24px', borderTop: '1px solid #9ca3af', width: '80%', paddingTop: '8px', fontSize: 12, color: '#4b5563' }}>
                <span style={{ fontWeight: 'bold' }}>{classTeacherName}</span> (Class Teacher)
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ color: brand.colors.secondary, fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' }}>Head Teacher's Comment</div>
              <div style={{ fontStyle: 'italic', color: '#374151', minHeight: '60px' }}>"{headTeacherComment}"</div>
              <div style={{ marginTop: '24px', borderTop: '1px solid #9ca3af', width: '80%', paddingTop: '8px', fontSize: 12, color: '#4b5563' }}>
                <span style={{ fontWeight: 'bold' }}>{headTeacherName}</span> (Head Teacher)
              </div>
              {/* Stamp placeholder */}
              <div style={{ position: 'absolute', bottom: -10, right: 10, width: 80, height: 80, borderRadius: '50%', border: `2px dashed ${brand.colors.primary}`, opacity: 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: brand.colors.primary, transform: 'rotate(-15deg)' }}>
                OFFICIAL STAMP
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '60px', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <div style={{ fontWeight: 'bold', color: '#111827', fontSize: 14 }}>Next term begins: {nextTermStart}</div>
            <div style={{ color: brand.colors.secondary, fontStyle: 'italic', fontSize: 12, margin: '8px 0' }}>"{brand.motto}"</div>
            <div style={{ fontSize: 9, color: '#9ca3af', marginTop: '16px' }}>Powered by NEXT OS</div>
          </div>
        </div>
      </div>
    );
  };

  const SchoolReportCardDemo = () => {
    const demoData = {
      student: { name: "Amani Joy", stream: "Blue", admissionNo: "P2026/042", class: "Primary 4" },
      term: "Term 2",
      year: "2026",
      subjects: [
        { name: "Mathematics", marks: 88, outOf: 100, grade: "A", remarks: "Excellent problem solving" },
        { name: "English Language", marks: 74, outOf: 100, grade: "B", remarks: "Good comprehension skills" },
        { name: "Science", marks: 92, outOf: 100, grade: "A+", remarks: "Outstanding performance" },
        { name: "Social Studies", marks: 65, outOf: 100, grade: "C", remarks: "Can do better with more focus" },
        { name: "Physical Education", marks: 80, outOf: 100, grade: "A", remarks: "Very active and disciplined" }
      ],
      attendance: { present: 58, absent: 2, late: 1, total: 60 },
      classTeacherRemarks: "Amani is a bright and dedicated student. She participates well in class discussions and shows great leadership potential.",
      headTeacherComment: "A remarkable term. Keep up the excellent work and continue to strive for the best.",
      nextTermStart: "September 8th, 2026",
      classTeacherName: "Mr. David Omondi",
      headTeacherName: "Mrs. Sarah Kamau"
    };

    return <SchoolReportCard {...demoData} />;
  };

  window.SchoolReportCard = SchoolReportCard;
  window.SchoolReportCardDemo = SchoolReportCardDemo;

})();
