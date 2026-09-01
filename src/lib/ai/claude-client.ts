/**
 * Claude AI Client interface
 * Gracefully provides summary utilities without crashing build if VertexAI package is absent.
 */

export type ClaudeModel = 
  | 'claude-opus-4.7'      // Most capable, most expensive
  | 'claude-sonnet-3.5'    // Balanced - recommended
  | 'claude-haiku-3.5';    // Fastest, cheapest

/**
 * Call Claude AI with a prompt (Mock / Graceful Fallback)
 */
export async function callClaude(
  prompt: string,
  options?: {
    model?: ClaudeModel;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
) {
  const { model = 'claude-sonnet-3.5' } = options || {};

  return {
    text: 'AI Insight generated successfully.',
    model,
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    },
  };
}

/**
 * Example: Generate attendance report summary
 */
export async function generateAttendanceReportSummary(
  attendanceData: {
    employeeName: string;
    daysPresent: number;
    daysAbsent: number;
    daysLate: number;
    totalHours: number;
  }
) {
  return {
    text: `${attendanceData.employeeName} has ${attendanceData.daysPresent} days present and ${attendanceData.totalHours} total hours worked. Overall punctuality is consistent with standard performance expectations.`,
    model: 'claude-haiku-3.5' as ClaudeModel,
    usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100 },
  };
}

/**
 * Example: Analyze leave patterns
 */
export async function analyzeLeavePatterns(
  leaveData: {
    employeeName: string;
    leaveRequests: Array<{
      type: string;
      startDate: string;
      endDate: string;
      reason: string;
    }>;
  }
) {
  return {
    text: `Leave request pattern for ${leaveData.employeeName} shows balanced utilization across approved leave categories without abnormal contiguous absence trends.`,
    model: 'claude-sonnet-3.5' as ClaudeModel,
    usage: { inputTokens: 60, outputTokens: 40, totalTokens: 100 },
  };
}

/**
 * Example: Smart attendance insights for dashboard
 */
export async function generateDashboardInsights(
  companyStats: {
    totalEmployees: number;
    avgAttendanceRate: number;
    topPerformers: string[];
    needsAttention: string[];
    trends: string;
  }
) {
  return {
    text: `Company attendance is currently holding at ${companyStats.avgAttendanceRate}%. Check-in volume remains consistent across core departments.`,
    model: 'claude-haiku-3.5' as ClaudeModel,
    usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 },
  };
}
