import { Router, Response } from 'express';
import { query, queryOne } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';
import axios from 'axios';
import { config } from '@/config';
import { runInNewContext } from 'vm';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();

// Store io instance reference (will be set by index.ts)
let io: SocketIOServer | null = null;

export function setSocketIO(socketIO: SocketIOServer) {
  io = socketIO;
}

// Language name normalization
const LANGUAGE_MAP: { [key: string]: string } = {
  'python': 'python',
  'python3': 'python',
  'py': 'python',
  'java': 'java',
  'cpp': 'cpp',
  'c++': 'cpp',
  'c': 'c',
  'javascript': 'javascript',
  'js': 'javascript',
  'typescript': 'typescript',
  'ts': 'typescript',
  'php': 'php',
  'ruby': 'ruby',
  'go': 'go',
  'rust': 'rust',
  'csharp': 'csharp',
  'cs': 'csharp',
  'swift': 'swift',
  'kotlin': 'kotlin',
  'scala': 'scala',
  'haskell': 'haskell',
};

// Language to Glot.io language identifiers
// Reference: https://glot.io/
const GLOT_LANGUAGE_MAP: { [key: string]: string } = {
  'python': 'python',
  'java': 'java',
  'cpp': 'cpp',
  'c++': 'cpp',
  'c': 'c',
  'javascript': 'javascript',
  'js': 'javascript',
  'typescript': 'typescript',
  'ts': 'typescript',
  'php': 'php',
  'ruby': 'ruby',
  'go': 'go',
  'rust': 'rust',
  'csharp': 'csharp',
  'cs': 'csharp',
  'swift': 'swift',
  'kotlin': 'kotlin',
  'scala': 'scala',
  'haskell': 'haskell',
};


/**
 * Code execution endpoint - Supports cloud-based execution via Piston API
 * Executes code in multiple languages: JS, Python, Java, C++, C#, Ruby, PHP, Go, Rust, etc.
 */
router.post('/execute', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language, sessionId } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language required' });
    }

    // Ensure language is a string
    const languageStr = String(language).trim().toLowerCase();

    if (!languageStr) {
      return res.status(400).json({ error: 'Language must be a non-empty string' });
    }

    // Normalize language name
    const normalizedLang = LANGUAGE_MAP[languageStr] || languageStr;

    console.log(`Executing ${normalizedLang} code via Piston API in session ${sessionId}...`);

    let output = '';
    let error: string | null = null;
    let status = 'Success';

    try {
      // For JavaScript, try local execution first (safer, faster, no network latency)
      if (normalizedLang === 'javascript' || normalizedLang === 'typescript') {
        output = executeJavaScriptLocal(code);
      } else {
        // Use Piston API for all other languages (Python, Java, C++, etc.)
        output = await executeViaGlot(code, normalizedLang);
      }
    } catch (execErr: any) {
      error = execErr.message;
      output = `Execution Error:\n${execErr.message}`;
      status = 'Error';
    }

    const result = {
      output: output.trim(),
      error: error,
      status: status,
      language: normalizedLang,
      timestamp: new Date().toISOString(),
      executedBy: req.user?.id,
    };

    // Broadcast execution result to all users in the session via Socket.io
    if (io && sessionId) {
      io.to(`session:${sessionId}`).emit('code:execution:result', result);
      console.log(`Broadcasted execution result to session:${sessionId}`);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Code execution error:', err.message);

    res.status(500).json({
      error: 'Code execution failed',
      message: err.message || 'Unknown error occurred',
    });
  }
});

/**
 * Execute code via Piston API (reliable, well-tested)
 * Supports: Python, Java, C++, C, C#, Ruby, PHP, Go, Rust, Swift, Kotlin, etc.
 * API: https://emkc.org/api/v2/execute - No authentication needed
 */
async function executeViaGlot(code: string, language: string): Promise<string> {
  try {
    const pistonLang = GLOT_LANGUAGE_MAP[language.toLowerCase()];
    
    if (!pistonLang) {
      throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(GLOT_LANGUAGE_MAP).join(', ')}`);
    }

    console.log(`Calling Piston API for ${language} (${pistonLang})...`);

    // Piston API endpoint
    const PISTON_API = 'https://emkc.org/api/v2/execute';
    
    const requestPayload = {
      language: pistonLang,
      version: '*', // Use latest version
      files: [
        {
          name: 'f.' + (pistonLang === 'javascript' ? 'js' : pistonLang === 'python' ? 'py' : pistonLang === 'java' ? 'java' : pistonLang === 'cpp' ? 'cpp' : pistonLang === 'csharp' ? 'cs' : pistonLang === 'typescript' ? 'ts' : pistonLang === 'ruby' ? 'rb' : pistonLang === 'go' ? 'go' : pistonLang === 'rust' ? 'rs' : pistonLang === 'php' ? 'php' : 'txt'),
          content: code,
        }
      ],
      stdin: '',
    };

    console.log('Piston API request:', { url: PISTON_API, language: pistonLang, code_length: code.length });

    const response = await axios.post(PISTON_API, requestPayload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Piston API response status:', response.status);
    console.log('Piston API response data:', JSON.stringify(response.data, null, 2));

    const result = response.data;

    // Handle compile errors
    if (result.compile && result.compile.stderr && result.compile.stderr.trim()) {
      const compileErr = result.compile.stderr.trim();
      if (!result.run || !result.run.stdout) {
        throw new Error(`Compilation Error:\n${compileErr}`);
      }
    }

    // Extract runtime output
    const stdout = (result.run && result.run.stdout) ? result.run.stdout.trim() : '';
    const stderr = (result.run && result.run.stderr) ? result.run.stderr.trim() : '';

    if (stdout) {
      return stdout;
    }

    if (stderr) {
      throw new Error(`Runtime Error:\n${stderr}`);
    }

    return 'Code executed successfully (no output)';
  } catch (err: any) {
    console.error('Piston API error:', {
      message: err.message,
      code: err.code,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      url: err.config?.url,
    });

    // Handle network errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error(`Piston API unavailable (${err.code})`);
    }

    // Handle HTTP errors
    if (err.response?.status) {
      throw new Error(`Piston API error (${err.response.status}): ${err.response.statusText}`);
    }

    throw new Error(`Code execution failed: ${err.message}`);
  }
}

/**
 * Execute code via Judge0 API (DEPRECATED - Left for reference)
 */
async function executeViaJudge0(code: string, language: string): Promise<string> {
  const JUDGE0_API = process.env.JUDGE0_API || 'https://ce.judge0.com';

  try {
    const langId = GLOT_LANGUAGE_MAP[language.toLowerCase()];
    
    if (!langId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    throw new Error('Judge0 is deprecated, use Glot.io instead');
  } catch (err: any) {
    throw new Error(`Code execution failed: ${err.message}`);
  }
}

/**
 * Execute code via Piston API (DEPRECATED - Left for reference)
 */
async function executeViaPiston(code: string, language: string): Promise<string> {
  const PISTON_API = process.env.PISTON_API || 'https://emkc.org/api/v2';

  try {
    console.log(`Calling Piston API (${PISTON_API}) for ${language}...`);

    const requestPayload = {
      language: language,
      version: '*',  // Use latest version
      files: [
        {
          name: 'main',
          content: code,
        },
      ],
      stdin: '',
    };

    console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

    const response = await axios.post(`${PISTON_API}/execute`, requestPayload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Piston API response:', JSON.stringify(response.data, null, 2));

    // Check for errors in response
    if (response.data.error) {
      throw new Error(`Piston Error: ${response.data.error}`);
    }

    // Get compile and run results
    const compile = response.data.compile || {};
    const run = response.data.run || {};

    // Handle compile stage errors
    if (compile.stderr?.trim()) {
      const compileError = compile.stderr.trim();
      // Only throw if there's no runtime output (sometimes stderr is warnings)
      if (!run.stdout) {
        throw new Error(`Compilation Error:\n${compileError}`);
      }
    }

    // Return runtime output (stdout + stderr if needed)
    const stdout = run.stdout?.trim() || '';
    const stderr = run.stderr?.trim() || '';
    
    if (stdout || stderr) {
      return stdout + (stdout && stderr ? '\n' : '') + stderr;
    }

    return 'Code executed successfully (no output)';
  } catch (err: any) {
    console.error('Piston API detailed error:', {
      message: err.message,
      code: err.code,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
    });

    // Re-throw compilation errors
    if (err.message.includes('Compilation Error')) {
      throw err;
    }

    // Handle network errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      throw new Error(`Piston API unavailable (${err.code}). Endpoint: ${PISTON_API}`);
    }

    // Handle HTTP errors
    if (err.response?.status === 404) {
      throw new Error(
        `Piston API Runtime Not Found (404). Language: ${language}. ` +
        `Available runtimes: ${PISTON_API}/runtimes`
      );
    }

    if (err.response?.status) {
      console.error('Full error response:', err.response.data);
      throw new Error(`Piston API error (${err.response.status}): ${err.response.statusText}`);
    }

    throw new Error(`Code execution failed: ${err.message}`);
  }
}

/**
 * Execute JavaScript/TypeScript code safely using Node VM
 * Faster and safer than cloud execution for JS - no network latency
 */
function executeJavaScriptLocal(code: string): string {
  let output = '';
  const originalLog = console.log;

  try {
    console.log = (...args: any[]) => {
      const line = args
        .map((arg) => {
          if (typeof arg === 'object') {
            return JSON.stringify(arg, null, 2);
          }
          return String(arg);
        })
        .join(' ');
      output += line + '\n';
      originalLog(...args);
    };

    // Create sandbox context with console object
    const context = {
      console: {
        log: (...args: any[]) => {
          const line = args
            .map((arg) => {
              if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
              }
              return String(arg);
            })
            .join(' ');
          output += line + '\n';
        },
      },
    };

    // Execute code in a safe VM context with 10 second timeout
    runInNewContext(code, context, { timeout: 10000 });

    return output.trim() || 'Code executed successfully (no output)';
  } finally {
    console.log = originalLog;
  }
}

/**
 * Get code snapshot from database
 */
router.get('/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await queryOne(
      'SELECT * FROM code_snapshots WHERE session_id = $1 ORDER BY saved_at DESC LIMIT 1',
      [req.params.sessionId]
    );

    res.json({
      success: true,
      data: snapshot,
    });
  } catch (err) {
    console.error('Get code snapshot error:', err);
    res.status(500).json({ error: 'Failed to get code snapshot' });
  }
});

// Save code snapshot
router.post('/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, language } = req.body;
    const now = new Date().toISOString();

    const result = await queryOne(
      `INSERT INTO code_snapshots (session_id, code, language, user_id, saved_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.sessionId, code, language, req.user?.id, now]
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('Save code snapshot error:', err);
    res.status(500).json({ error: 'Failed to save code' });
  }
});

/**
 * Get the full ordered code-editor activity recording for playback.
 * Only available once the session has completed and recording was opted into.
 */
router.get('/:sessionId/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const session = await queryOne(
      'SELECT id, mentor_id, student_id, status, recording_enabled, started_at, ended_at, title, code_language FROM sessions WHERE id = $1',
      [req.params.sessionId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.mentor_id !== userId && session.student_id !== userId) {
      return res.status(403).json({ error: 'You are not a participant in this session' });
    }

    if (!session.recording_enabled) {
      return res.status(404).json({ error: 'Recording was not enabled for this session' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ error: 'Recording is only available once the session has ended' });
    }

    const events = await query(
      `SELECT code, language, user_id, saved_at
       FROM code_snapshots WHERE session_id = $1
       ORDER BY saved_at ASC`,
      [req.params.sessionId]
    );

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          code_language: session.code_language,
          started_at: session.started_at,
          ended_at: session.ended_at,
        },
        events: events.rows,
      },
    });
  } catch (err) {
    console.error('Get code recording history error:', err);
    res.status(500).json({ error: 'Failed to get code recording history' });
  }
});


/**
 * List available languages from Glot.io API (PUBLIC - no auth needed)
 */
router.get('/runtimes', async (req: any, res: Response) => {
  try {
    res.json({
      success: true,
      totalLanguages: Object.keys(GLOT_LANGUAGE_MAP).length,
      languages: Object.keys(GLOT_LANGUAGE_MAP).map(lang => ({
        name: lang,
        id: GLOT_LANGUAGE_MAP[lang],
      })),
    });
  } catch (err: any) {
    console.error('Failed to get languages:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available languages',
      details: err.message,
    });
  }
});

/**
 * List available runtimes from Piston API (DEPRECATED - Left for reference)
 */
router.get('/runtimes-piston', async (req: any, res: Response) => {
  try {
    const PISTON_API = process.env.PISTON_API || 'https://emkc.org/api/v2';

    const runtimesResponse = await axios.get(`${PISTON_API}/runtimes`, {
      timeout: 5000,
    });

    const runtimes = runtimesResponse.data || [];
    
    // Organize by language
    const byLanguage: { [key: string]: any[] } = {};
    runtimes.forEach((runtime: any) => {
      if (!byLanguage[runtime.language]) {
        byLanguage[runtime.language] = [];
      }
      byLanguage[runtime.language].push(runtime.version);
    });

    res.json({
      success: true,
      totalRuntimes: runtimes.length,
      byLanguage,
      allRuntimes: runtimes,
    });
  } catch (err: any) {
    console.error('Failed to fetch Piston runtimes:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available runtimes',
      details: err.message,
    });
  }
});

/**
 * Health check - Verify code execution service is available
 * Tests JavaScript locally and checks Piston API connectivity
 */
router.get('/health/check', async (req: AuthRequest, res: Response) => {
  try {
    // Test JavaScript execution
    const jsTest = executeJavaScriptLocal('console.log("JS works!")');

    // Test Piston connectivity with Python
    let pistonStatus = 'checking';
    try {
      const pythonTest = await executeViaGlot('print("Piston works!")', 'python');
      pistonStatus = 'available';
      console.log('Piston test passed:', pythonTest);
    } catch (e: any) {
      console.warn('Piston test failed:', e.message);
      pistonStatus = 'error';
    }

    res.json({
      success: true,
      message: 'Code execution service is available',
      localExecution: {
        status: 'available',
        test: 'Passed',
        jsTest: jsTest,
      },
      pistonAPI: {
        endpoint: 'https://emkc.org/api/v2/execute',
        status: pistonStatus,
        supportedLanguages: Object.keys(GLOT_LANGUAGE_MAP),
      },
    });
  } catch (err: any) {
    console.error('Health check error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Code execution health check failed',
      error: err.message,
    });
  }
});

export default router;
