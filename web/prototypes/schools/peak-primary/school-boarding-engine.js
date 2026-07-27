(function() {
  'use strict';

  // Private state and mock data
  const DORMITORIES = [
    {
      id: 'dorm_boys_kizito',
      name: 'St. Kizito Boys Dorm',
      capacity: 25,
      occupied: 18,
      matron: 'Tr. Sarah N.',
      gender: 'M'
    },
    {
      id: 'dorm_girls_mary',
      name: 'St. Mary Girls House',
      capacity: 25,
      occupied: 20,
      matron: 'Tr. Agnes K.',
      gender: 'F'
    }
  ];

  // Mock boarding roster for 18 students
  const BOARDING_ROSTER = [
    { id: 'STU-B001', name: 'John Doe', class: 'P.4', dormId: 'dorm_boys_kizito', bedNo: 1, gender: 'M' },
    { id: 'STU-B002', name: 'James Smith', class: 'P.5', dormId: 'dorm_boys_kizito', bedNo: 2, gender: 'M' },
    { id: 'STU-B003', name: 'Peter Parker', class: 'P.6', dormId: 'dorm_boys_kizito', bedNo: 3, gender: 'M' },
    { id: 'STU-B004', name: 'Bruce Wayne', class: 'P.7', dormId: 'dorm_boys_kizito', bedNo: 4, gender: 'M' },
    { id: 'STU-B005', name: 'Clark Kent', class: 'P.4', dormId: 'dorm_boys_kizito', bedNo: 5, gender: 'M' },
    { id: 'STU-B006', name: 'Barry Allen', class: 'P.5', dormId: 'dorm_boys_kizito', bedNo: 6, gender: 'M' },
    { id: 'STU-B007', name: 'Arthur Curry', class: 'P.6', dormId: 'dorm_boys_kizito', bedNo: 7, gender: 'M' },
    { id: 'STU-B008', name: 'Victor Stone', class: 'P.7', dormId: 'dorm_boys_kizito', bedNo: 8, gender: 'M' },
    { id: 'STU-B009', name: 'Oliver Queen', class: 'P.4', dormId: 'dorm_boys_kizito', bedNo: 9, gender: 'M' },
    { id: 'STU-G001', name: 'Jane Doe', class: 'P.4', dormId: 'dorm_girls_mary', bedNo: 1, gender: 'F' },
    { id: 'STU-G002', name: 'Mary Johnson', class: 'P.5', dormId: 'dorm_girls_mary', bedNo: 2, gender: 'F' },
    { id: 'STU-G003', name: 'Diana Prince', class: 'P.6', dormId: 'dorm_girls_mary', bedNo: 3, gender: 'F' },
    { id: 'STU-G004', name: 'Natasha Romanoff', class: 'P.7', dormId: 'dorm_girls_mary', bedNo: 4, gender: 'F' },
    { id: 'STU-G005', name: 'Wanda Maximoff', class: 'P.4', dormId: 'dorm_girls_mary', bedNo: 5, gender: 'F' },
    { id: 'STU-G006', name: 'Carol Danvers', class: 'P.5', dormId: 'dorm_girls_mary', bedNo: 6, gender: 'F' },
    { id: 'STU-G007', name: 'Jean Grey', class: 'P.6', dormId: 'dorm_girls_mary', bedNo: 7, gender: 'F' },
    { id: 'STU-G008', name: 'Ororo Munroe', class: 'P.7', dormId: 'dorm_girls_mary', bedNo: 8, gender: 'F' },
    { id: 'STU-G009', name: 'Gwen Stacy', class: 'P.4', dormId: 'dorm_girls_mary', bedNo: 9, gender: 'F' }
  ];

  // The Engine Singleton
  const SchoolBoardingEngine = {
    /**
     * Updates the operating model of the school and stores it in localStorage.
     * @param {string} tenantId 
     * @param {'day_only' | 'boarding_only' | 'mixed_day_boarding'} modelType 
     */
    setSchoolModel: function(tenantId, modelType) {
      localStorage.setItem(`nextos.school_model.${tenantId}`, modelType);
      window.dispatchEvent(new CustomEvent('school-operating-model-changed', {
        detail: { tenantId, modelType }
      }));
    },

    /**
     * Determines the operating model of the school based on tenant ID.
     * @param {string} tenantId 
     * @returns {'day_only' | 'boarding_only' | 'mixed_day_boarding'}
     */
    getSchoolModel: function(tenantId) {
      const storedModel = localStorage.getItem(`nextos.school_model.${tenantId}`);
      if (storedModel) return storedModel;
      
      return 'mixed_day_boarding'; // Default fallback
    },

    /**
     * Auto-detects if a student is a boarder based on their fee structure.
     * @param {Object} studentFeeRecord
     * @param {Array<string>} [studentFeeRecord.items] - Array of fee item names
     * @param {number} [studentFeeRecord.totalFees] - Total fees amount in UGX
     * @returns {boolean}
     */
    isBoarder: function(studentFeeRecord) {
      if (!studentFeeRecord) return false;
      
      const items = studentFeeRecord.items || [];
      const totalFees = studentFeeRecord.totalFees || 0;
      
      const hasBoardingItem = items.some(item => 
        item.toLowerCase().includes('boarding') || item.toLowerCase().includes('hostel')
      );
      
      return hasBoardingItem || totalFees > 550000;
    },

    /**
     * Retrieves the roster of boarding students.
     * @param {string} tenantId 
     * @returns {Array<Object>} List of boarding students
     */
    getBoardingRoster: function(tenantId) {
      // In a real app, this would filter by tenantId.
      return BOARDING_ROSTER.map(student => ({
        ...student,
        residenceType: 'boarding',
        tagLabel: '🌙 Boarder',
        tagColor: '#3B82F6'
      }));
    },

    /**
     * Retrieves dormitory statistics and capacities.
     * @param {string} tenantId 
     * @returns {Array<Object>} List of dormitories
     */
    getDormitories: function(tenantId) {
      return DORMITORIES;
    },

    /**
     * Retrieves a ring-fenced split financial ledger for Day and Boarding funds.
     * @param {string} tenantId 
     * @returns {Object} Split ledger data
     */
    getSplitLedger: function(tenantId) {
      const dayIncome = 45200000;
      const dayExpenses = 38100000;
      const dayReserve = dayIncome - dayExpenses;

      const boardingIncome = 24500000;
      const boardingExpenses = 19800000;
      const boardingReserve = boardingIncome - boardingExpenses;
      
      const isCrossEncroaching = boardingExpenses > boardingIncome;
      const warningMessage = isCrossEncroaching 
        ? "Warning: Boarding expenses exceed boarding income. Cross-fund encroachment detected!" 
        : null;

      return {
        tenantId: tenantId,
        funds: {
          dayScholarFund: {
            name: "Day Scholar Fund ☀️",
            income: {
              total: dayIncome,
              breakdown: ["Day Tuition", "Books", "Day Lunch"]
            },
            expenses: {
              total: dayExpenses,
              breakdown: ["Teacher Salaries", "Classroom Materials", "Day Utilities", "School Maintenance"]
            },
            reserveBalance: dayReserve
          },
          boardingScholarFund: {
            name: "Boarding Scholar Fund 🌙",
            income: {
              total: boardingIncome,
              breakdown: ["Boarding & Hostel Fees", "Night Meals Levy", "Bedding Fee"]
            },
            expenses: {
              total: boardingExpenses,
              breakdown: ["Night Meals/Groceries", "Firewood & Gas", "Matron Stipends", "Night Security", "Dorm Maintenance"]
            },
            reserveBalance: boardingReserve
          }
        },
        financialHealth: {
          isCrossEncroaching: isCrossEncroaching,
          warningMessage: warningMessage
        }
      };
    },

    /**
     * Updates the dormitory assignment for a specific student.
     * @param {string} studentId 
     * @param {string} dormId 
     * @param {number} bedNo 
     * @returns {Object} Updated student record or error
     */
    updateDormAssignment: function(studentId, dormId, bedNo) {
      const studentIndex = BOARDING_ROSTER.findIndex(s => s.id === studentId);
      if (studentIndex === -1) {
        return { success: false, error: 'Student not found in boarding roster' };
      }
      
      BOARDING_ROSTER[studentIndex].dormId = dormId;
      BOARDING_ROSTER[studentIndex].bedNo = bedNo;
      
      return { success: true, student: BOARDING_ROSTER[studentIndex] };
    }
  };

  // Expose to window as a singleton
  window.SCHOOL_BOARDING_ENGINE = SchoolBoardingEngine;

})();
