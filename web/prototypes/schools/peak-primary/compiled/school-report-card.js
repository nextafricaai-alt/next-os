// React and ReactDOM are page globals (UMD). No import lines: these files are
// loaded as plain <script type="text/babel">, where import breaks the file.
(function () {
  const {
    React,
    SchoolDocumentHeader
  } = window;
  const {
    useState
  } = React || {
    useState: function () {}
  };
  const DEFAULT_BRAND = {
    colors: {
      primary: "#1e3a8a",
      secondary: "#f59e0b",
      accent: "#3b82f6"
    },
    motto: "Striving for Excellence"
  };
  const getBrand = () => window.SCHOOL_BRAND || DEFAULT_BRAND;
  const getGradeColor = grade => {
    switch (grade) {
      case 'A':
      case 'A+':
        return '#10b981';
      // green
      case 'B':
        return '#3b82f6';
      // blue
      case 'C':
        return '#f59e0b';
      // amber
      case 'D':
        return '#f97316';
      // orange
      case 'E':
      case 'F':
        return '#ef4444';
      // red
      default:
        return '#6b7280';
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
    headTeacherName
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
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 800,
        margin: '0 auto',
        fontFamily: 'sans-serif',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "no-print",
      style: {
        display: 'flex',
        gap: '8px',
        padding: '16px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        marginBottom: '24px',
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: handlePrint,
      style: {
        padding: '8px 16px',
        background: brand.colors.primary,
        color: 'white',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        fontWeight: 'bold'
      }
    }, "\uD83D\uDDA8\uFE0F Print / PDF"), /*#__PURE__*/React.createElement("button", {
      onClick: handleShare,
      style: {
        padding: '8px 16px',
        background: '#25D366',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        fontWeight: 'bold'
      }
    }, "\uD83D\uDCAC Share WhatsApp")), /*#__PURE__*/React.createElement("div", {
      className: "document-print-area",
      style: {
        background: 'white',
        padding: '40px',
        boxSizing: 'border-box',
        minHeight: '1122px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
      }
    }, SchoolDocumentHeader ? /*#__PURE__*/React.createElement(SchoolDocumentHeader, {
      docType: "TERM REPORT"
    }) : /*#__PURE__*/React.createElement("div", null, "Missing SchoolDocumentHeader component"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        padding: '12px 20px',
        borderRadius: '8px',
        marginTop: '24px',
        border: '1px solid #e5e7eb'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: 600
      }
    }, "Student Name"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827'
      }
    }, student.name, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: 'normal'
      }
    }, "(#", student.admissionNo, ")"))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280',
        textTransform: 'uppercase',
        fontWeight: 600
      }
    }, "Class & Term"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 'bold',
        color: brand.colors.primary
      }
    }, student.class, " ", student.stream, " | ", term, " ", year))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '24px'
      }
    }, /*#__PURE__*/React.createElement("table", {
      style: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 14
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        backgroundColor: brand.colors.primary,
        color: 'white'
      }
    }, /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '12px',
        textAlign: 'center',
        width: '50px'
      }
    }, "No."), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '12px',
        textAlign: 'left'
      }
    }, "Subject"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '12px',
        textAlign: 'center',
        width: '80px'
      }
    }, "Marks"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '12px',
        textAlign: 'center',
        width: '80px'
      }
    }, "Out Of"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '12px',
        textAlign: 'center',
        width: '80px'
      }
    }, "Grade"), /*#__PURE__*/React.createElement("th", {
      style: {
        padding: '12px',
        textAlign: 'left'
      }
    }, "Remarks"))), /*#__PURE__*/React.createElement("tbody", null, subjects.map((sub, idx) => /*#__PURE__*/React.createElement("tr", {
      key: idx,
      style: {
        backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        textAlign: 'center',
        color: '#6b7280'
      }
    }, idx + 1), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        fontWeight: 600
      }
    }, sub.name), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        textAlign: 'center',
        fontWeight: 'bold'
      }
    }, sub.marks), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        textAlign: 'center',
        color: '#6b7280'
      }
    }, sub.outOf), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        backgroundColor: getGradeColor(sub.grade),
        color: 'white',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: 12,
        fontWeight: 'bold'
      }
    }, sub.grade)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        fontStyle: 'italic',
        color: '#4b5563'
      }
    }, sub.remarks))), /*#__PURE__*/React.createElement("tr", {
      style: {
        backgroundColor: '#f3f4f6',
        fontWeight: 'bold'
      }
    }, /*#__PURE__*/React.createElement("td", {
      colSpan: "2",
      style: {
        padding: '12px',
        textAlign: 'right'
      }
    }, "TOTAL / AVERAGE"), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        textAlign: 'center',
        color: brand.colors.primary
      }
    }, totalMarks), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        textAlign: 'center'
      }
    }, possibleMarks), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '12px',
        textAlign: 'center'
      }
    }, average, "%"), /*#__PURE__*/React.createElement("td", null))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '24px',
        marginTop: '24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        border: `1px solid ${brand.colors.secondary}`,
        borderRadius: '8px',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        backgroundColor: brand.colors.secondary,
        color: 'white',
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: '0.05em'
      }
    }, "PERFORMANCE SUMMARY"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        padding: '16px',
        justifyContent: 'space-around',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        color: brand.colors.primary
      }
    }, totalMarks), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280'
      }
    }, "AGGREGATE")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        color: getGradeColor(overallGrade)
      }
    }, overallGrade), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280'
      }
    }, "GRADE")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 'bold'
      }
    }, "5"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280'
      }
    }, "POSITION")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 'bold'
      }
    }, "42"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280'
      }
    }, "OUT OF")))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        backgroundColor: '#e5e7eb',
        color: '#4b5563',
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: '0.05em'
      }
    }, "ATTENDANCE"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        padding: '16px',
        justifyContent: 'space-around',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10b981'
      }
    }, attendance.present), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280'
      }
    }, "PRESENT")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ef4444'
      }
    }, attendance.absent), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280'
      }
    }, "ABSENT")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f59e0b'
      }
    }, attendance.late), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280'
      }
    }, "LATE")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 24,
        fontWeight: 'bold',
        color: brand.colors.primary
      }
    }, Math.round(attendance.present / attendance.total * 100), "%"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#6b7280'
      }
    }, "RATE"))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: '40px',
        marginTop: '32px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: brand.colors.secondary,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: '8px'
      }
    }, "Class Teacher's Remarks"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontStyle: 'italic',
        color: '#374151',
        minHeight: '60px'
      }
    }, "\"", classTeacherRemarks, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '24px',
        borderTop: '1px solid #9ca3af',
        width: '80%',
        paddingTop: '8px',
        fontSize: 12,
        color: '#4b5563'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 'bold'
      }
    }, classTeacherName), " (Class Teacher)")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: brand.colors.secondary,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: '8px'
      }
    }, "Head Teacher's Comment"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontStyle: 'italic',
        color: '#374151',
        minHeight: '60px'
      }
    }, "\"", headTeacherComment, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '24px',
        borderTop: '1px solid #9ca3af',
        width: '80%',
        paddingTop: '8px',
        fontSize: 12,
        color: '#4b5563'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 'bold'
      }
    }, headTeacherName), " (Head Teacher)"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: -10,
        right: 10,
        width: 80,
        height: 80,
        borderRadius: '50%',
        border: `2px dashed ${brand.colors.primary}`,
        opacity: 0.3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        color: brand.colors.primary,
        transform: 'rotate(-15deg)'
      }
    }, "OFFICIAL STAMP"))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: '60px',
        textAlign: 'center',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '20px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 'bold',
        color: '#111827',
        fontSize: 14
      }
    }, "Next term begins: ", nextTermStart), /*#__PURE__*/React.createElement("div", {
      style: {
        color: brand.colors.secondary,
        fontStyle: 'italic',
        fontSize: 12,
        margin: '8px 0'
      }
    }, "\"", brand.motto, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: '#9ca3af',
        marginTop: '16px'
      }
    }, "Powered by NEXT OS"))));
  };
  const SchoolReportCardDemo = () => {
    const demoData = {
      student: {
        name: "Amani Joy",
        stream: "Blue",
        admissionNo: "P2026/042",
        class: "Primary 4"
      },
      term: "Term 2",
      year: "2026",
      subjects: [{
        name: "Mathematics",
        marks: 88,
        outOf: 100,
        grade: "A",
        remarks: "Excellent problem solving"
      }, {
        name: "English Language",
        marks: 74,
        outOf: 100,
        grade: "B",
        remarks: "Good comprehension skills"
      }, {
        name: "Science",
        marks: 92,
        outOf: 100,
        grade: "A+",
        remarks: "Outstanding performance"
      }, {
        name: "Social Studies",
        marks: 65,
        outOf: 100,
        grade: "C",
        remarks: "Can do better with more focus"
      }, {
        name: "Physical Education",
        marks: 80,
        outOf: 100,
        grade: "A",
        remarks: "Very active and disciplined"
      }],
      attendance: {
        present: 58,
        absent: 2,
        late: 1,
        total: 60
      },
      classTeacherRemarks: "Amani is a bright and dedicated student. She participates well in class discussions and shows great leadership potential.",
      headTeacherComment: "A remarkable term. Keep up the excellent work and continue to strive for the best.",
      nextTermStart: "September 8th, 2026",
      classTeacherName: "Mr. David Omondi",
      headTeacherName: "Mrs. Sarah Kamau"
    };
    return /*#__PURE__*/React.createElement(SchoolReportCard, demoData);
  };
  window.SchoolReportCard = SchoolReportCard;
  window.SchoolReportCardDemo = SchoolReportCardDemo;
})();