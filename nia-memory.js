/**
 * Nia Memory Engine (nia-memory.js)
 * Persistent memory layer for the Nia AI.
 * Stores observations about tenants over time so Nia can learn patterns and reason from history.
 *
 * --- SQL Schema for Supabase ---
 * 
 * CREATE TABLE nia_memory (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   tenant_id text NOT NULL,
 *   event_type text NOT NULL,
 *   data jsonb NOT NULL,
 *   embedding_text text,
 *   severity text,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE INDEX idx_nia_memory_tenant_id ON nia_memory(tenant_id);
 * CREATE INDEX idx_nia_memory_created_at ON nia_memory(created_at);
 *
 * CREATE TABLE nia_predictions (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   tenant_id text NOT NULL,
 *   prediction_type text NOT NULL,
 *   subject_id text,
 *   confidence float,
 *   reasoning text,
 *   predicted_for date,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE INDEX idx_nia_predictions_tenant_id ON nia_predictions(tenant_id);
 * -------------------------------
 */

(function() {
    // --- Utilities ---
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getLocalStorageKey(tenantId, prefix) {
        return prefix + '_' + tenantId;
    }

    function readLocalStorage(key) {
        try {
            var data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('NIA_MEMORY: Error reading from localStorage', e);
            return [];
        }
    }

    function writeLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('NIA_MEMORY: Error writing to localStorage', e);
        }
    }

    // --- Constants ---
    var MAX_MEMORY_ENTRIES = 200;
    var MEMORY_PREFIX = 'nia_memory';
    var PREDICTIONS_PREFIX = 'nia_predictions';

    // --- Engine ---
    var NiaMemory = {
        /**
         * Writes an event to memory (Supabase + localStorage ring buffer).
         * @param {string} tenantId 
         * @param {string} eventType e.g., 'attendance_dip', 'fee_late', 'fee_paid', 'staff_absent', etc.
         * @param {object} data 
         * @param {string} severity e.g., 'low', 'medium', 'high', 'critical'
         */
        write: async function(tenantId, eventType, data, severity) {
            if (!tenantId || !eventType) throw new Error("NIA_MEMORY: tenantId and eventType are required.");

            var entry = {
                id: generateUUID(),
                tenant_id: tenantId,
                event_type: eventType,
                data: data || {},
                severity: severity || 'info',
                created_at: new Date().toISOString()
            };

            // 1. Write to Supabase if available
            var sb = window.NextSession && window.NextSession.sb;
            if (sb) {
                try {
                    await sb.from('nia_memory').insert([entry]);
                } catch (e) {
                    console.error('NIA_MEMORY: Supabase write error (nia_memory):', e);
                }
            }

            // 2. Update localStorage (fallback & local cache ring buffer)
            var lsKey = getLocalStorageKey(tenantId, MEMORY_PREFIX);
            var memory = readLocalStorage(lsKey);
            memory.unshift(entry);
            if (memory.length > MAX_MEMORY_ENTRIES) {
                memory = memory.slice(0, MAX_MEMORY_ENTRIES);
            }
            writeLocalStorage(lsKey, memory);

            return entry;
        },

        /**
         * Reads memory entries for a tenant.
         * @param {string} tenantId 
         * @param {string} [eventType] Optional filter by event type.
         * @param {number} [days=30] Number of past days to read.
         */
        read: async function(tenantId, eventType, days) {
            if (!tenantId) return [];
            var daysToFetch = days || 30;
            var cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToFetch);
            var cutoffIso = cutoffDate.toISOString();

            var sb = window.NextSession && window.NextSession.sb;
            if (sb) {
                try {
                    var query = sb.from('nia_memory')
                        .select('*')
                        .eq('tenant_id', tenantId)
                        .gte('created_at', cutoffIso)
                        .order('created_at', { ascending: false });

                    if (eventType) {
                        query = query.eq('event_type', eventType);
                    }

                    var result = await query;
                    if (!result.error && result.data) return result.data;
                } catch (e) {
                    console.error('NIA_MEMORY: Supabase read error (nia_memory):', e);
                }
            }

            // Fallback to localStorage
            var lsKey = getLocalStorageKey(tenantId, MEMORY_PREFIX);
            var memory = readLocalStorage(lsKey);
            
            return memory.filter(function(entry) {
                var isAfterCutoff = new Date(entry.created_at) >= cutoffDate;
                var matchesType = eventType ? entry.event_type === eventType : true;
                return isAfterCutoff && matchesType;
            });
        },

        /**
         * Analyzes the last 30 days of memory for patterns.
         * @param {string} tenantId 
         */
        getPatterns: async function(tenantId) {
            var memory = await this.read(tenantId, null, 30);
            
            var patterns = {
                attendanceRhythm: [],
                feePaymentBehaviour: {},
                staffAbsencePatterns: [],
                anomalies: [],
                insights: []
            };

            // Basic analysis logic
            var lateFees = 0;
            var onTimeFees = 0;
            var staffAbsences = {};

            memory.forEach(function(entry) {
                if (entry.event_type === 'fee_late') lateFees++;
                if (entry.event_type === 'fee_paid') onTimeFees++;
                
                if (entry.event_type === 'staff_absent') {
                    var staffId = (entry.data && entry.data.staff_id) ? entry.data.staff_id : 'unknown';
                    staffAbsences[staffId] = (staffAbsences[staffId] || 0) + 1;
                }

                if (entry.severity === 'high' || entry.severity === 'critical' || entry.event_type === 'data_anomaly') {
                    patterns.anomalies.push(entry);
                }
            });

            patterns.feePaymentBehaviour = {
                lateFees: lateFees,
                onTimeFees: onTimeFees,
                reliability: (onTimeFees + lateFees) > 0 ? (onTimeFees / (onTimeFees + lateFees)) : 1
            };

            for (var staffId in staffAbsences) {
                if (staffAbsences[staffId] > 2) {
                    patterns.staffAbsencePatterns.push({ 
                        staffId: staffId, 
                        count: staffAbsences[staffId], 
                        note: 'Frequent absences detected' 
                    });
                }
            }

            // Generate some basic insights based on data
            if (patterns.feePaymentBehaviour.reliability < 0.8) {
                patterns.insights.push("Fee payment reliability is below 80% this month.");
            }
            if (patterns.anomalies.length > 5) {
                patterns.insights.push("Detected " + patterns.anomalies.length + " significant anomalies in the last 30 days.");
            }

            return patterns;
        },

        /**
         * Writes a prediction.
         * @param {string} tenantId 
         * @param {string} type 
         * @param {string} subjectId 
         * @param {number} confidence 
         * @param {string} reasoning 
         * @param {string} [predictedFor]
         */
        writePrediction: async function(tenantId, type, subjectId, confidence, reasoning, predictedFor) {
            var entry = {
                id: generateUUID(),
                tenant_id: tenantId,
                prediction_type: type,
                subject_id: subjectId,
                confidence: confidence,
                reasoning: reasoning,
                predicted_for: predictedFor || new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString()
            };

            var sb = window.NextSession && window.NextSession.sb;
            if (sb) {
                try {
                    await sb.from('nia_predictions').insert([entry]);
                } catch (e) {
                    console.error('NIA_MEMORY: Supabase write error (nia_predictions):', e);
                }
            }

            var lsKey = getLocalStorageKey(tenantId, PREDICTIONS_PREFIX);
            var predictions = readLocalStorage(lsKey);
            predictions.unshift(entry);
            if (predictions.length > 100) predictions = predictions.slice(0, 100);
            writeLocalStorage(lsKey, predictions);

            return entry;
        },

        /**
         * Reads predictions.
         * @param {string} tenantId 
         * @param {string} [type] Optional filter by prediction type.
         */
        readPredictions: async function(tenantId, type) {
            if (!tenantId) return [];
            
            var sb = window.NextSession && window.NextSession.sb;
            if (sb) {
                try {
                    var query = sb.from('nia_predictions')
                        .select('*')
                        .eq('tenant_id', tenantId)
                        .order('created_at', { ascending: false });
                        
                    if (type) query = query.eq('prediction_type', type);
                    
                    var result = await query;
                    if (!result.error && result.data) return result.data;
                } catch (e) {
                    console.error('NIA_MEMORY: Supabase read error (nia_predictions):', e);
                }
            }

            var lsKey = getLocalStorageKey(tenantId, PREDICTIONS_PREFIX);
            var predictions = readLocalStorage(lsKey);
            if (type) {
                predictions = predictions.filter(function(p) { return p.prediction_type === type; });
            }
            return predictions;
        },

        /**
         * Natural language insight based on stored patterns.
         * @param {string} tenantId 
         * @param {string} question 
         */
        getInsight: async function(tenantId, question) {
            var patterns = await this.getPatterns(tenantId);
            var q = (question || "").toLowerCase();

            if (q.indexOf('attendance') !== -1 || q.indexOf('dip') !== -1) {
                var anomalyCount = patterns.anomalies.filter(function(a) { return a.event_type === 'attendance_dip'; }).length;
                if (anomalyCount > 0) {
                    return "This attendance dip seems part of a pattern; there have been " + anomalyCount + " similar dips in the last 30 days.";
                }
                return "This attendance dip appears unusual based on the last 30 days of data.";
            }

            if (q.indexOf('fee') !== -1 || q.indexOf('payment') !== -1) {
                var reliability = (patterns.feePaymentBehaviour.reliability * 100).toFixed(0);
                return "Current fee payment reliability is " + reliability + "%. There were " + patterns.feePaymentBehaviour.lateFees + " late payments recently.";
            }

            if (q.indexOf('staff') !== -1 || q.indexOf('absence') !== -1) {
                if (patterns.staffAbsencePatterns.length > 0) {
                    return "There are recurring staff absence patterns. " + patterns.staffAbsencePatterns.length + " staff member(s) have been absent multiple times.";
                }
                return "Staff attendance seems normal compared to the 30-day baseline.";
            }

            return patterns.insights.length > 0 
                ? "Insight: " + patterns.insights[0] 
                : "Memory records do not show significant anomalies for this query.";
        },

        /**
         * Detects if a value is anomalous compared to a 30-day memory.
         * @param {string} tenantId 
         * @param {string} metricName Property name to extract from entry.data
         * @param {number} currentValue 
         */
        selfHealCheck: async function(tenantId, metricName, currentValue) {
            // Read past 30 days
            var memory = await this.read(tenantId, null, 30);
            
            // Extract numeric values for the given metricName from data
            var values = [];
            memory.forEach(function(entry) {
                if (entry.data && typeof entry.data[metricName] === 'number') {
                    values.push(entry.data[metricName]);
                }
            });

            if (values.length < 3) {
                return { anomaly: false, message: "Not enough historical data to establish a baseline." };
            }

            var sum = values.reduce(function(a, b) { return a + b; }, 0);
            var mean = sum / values.length;
            var variance = values.reduce(function(a, b) { return a + Math.pow(b - mean, 2); }, 0) / values.length;
            var stdDev = Math.sqrt(variance);

            var zScore = stdDev === 0 ? 0 : Math.abs(currentValue - mean) / stdDev;

            if (zScore > 2) {
                return { 
                    anomaly: true, 
                    message: "Value " + currentValue + " is anomalous. (Mean: " + mean.toFixed(2) + ", StdDev: " + stdDev.toFixed(2) + ")" 
                };
            }

            return { anomaly: false, message: "Value is within normal range." };
        }
    };

    window.NIA_MEMORY = NiaMemory;
})();
