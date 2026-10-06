/**
 * Compiler Service
 * Handles code execution against local/custom Piston instance
 * with seamless fallback to public Wandbox engine for zero downtime.
 */

const DEFAULT_PISTON_URL = process.env.REACT_APP_COMPILER_URL || 'http://localhost:2000';
const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json';

// Supported Languages & Metadata
export const SUPPORTED_LANGUAGES = [
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '⚡',
    aceMode: 'javascript',
    pistonLang: 'javascript',
    wandboxCompiler: 'nodejs-20.17.0',
    fileExtension: 'js',
    defaultCode: `// JavaScript Playground (Node.js)
// Example: Two Sum Interview Problem

function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

const nums = [2, 7, 11, 15];
const target = 9;
const result = twoSum(nums, target);

console.log(JSON.stringify({
  input: { nums, target },
  indices: result,
  values: result.map(i => nums[i]),
  solved: true
}, null, 2));
`
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    icon: '📘',
    aceMode: 'typescript',
    pistonLang: 'typescript',
    wandboxCompiler: 'typescript-5.6.2',
    fileExtension: 'ts',
    defaultCode: `// TypeScript Playground
interface UserResult {
  userId: number;
  score: number;
  status: 'passed' | 'failed';
}

function processSubmission(id: number, score: number): UserResult {
  return {
    userId: id,
    score,
    status: score >= 70 ? 'passed' : 'failed'
  };
}

const candidate = processSubmission(101, 88);
console.log(JSON.stringify(candidate, null, 2));
`
  },
  {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    aceMode: 'python',
    pistonLang: 'python',
    wandboxCompiler: 'cpython-3.12.7',
    fileExtension: 'py',
    defaultCode: `# Python 3 Playground
import json

def longest_consecutive(nums):
    num_set = set(nums)
    longest = 0
    
    for n in num_set:
        if (n - 1) not in num_set:
            length = 1
            while (n + length) in num_set:
                length += 1
            longest = max(length, longest)
            
    return longest

numbers = [100, 4, 200, 1, 3, 2]
res = longest_consecutive(numbers)

output = {
    "numbers": numbers,
    "longest_consecutive_sequence": res,
    "algorithm": "O(N) HashSet"
}

print(json.dumps(output, indent=2))
`
  },
  {
    id: 'java',
    name: 'Java',
    icon: '☕',
    aceMode: 'java',
    pistonLang: 'java',
    wandboxCompiler: 'openjdk-jdk-22+36',
    fileExtension: 'java',
    defaultCode: `// Java 21+ Playground
import java.util.*;

class Main {
    public static void main(String[] args) {
        int[] nums = {1, 2, 3, 4, 5};
        int sum = Arrays.stream(nums).sum();
        
        System.out.printf("{\\n  \\"status\\": \\"success\\",\\n  \\"sum\\": %d,\\n  \\"elements\\": %d\\n}\\n", sum, nums.length);
    }
}
`
  },
  {
    id: 'cpp',
    name: 'C++',
    icon: '⚙️',
    aceMode: 'c_cpp',
    pistonLang: 'cpp',
    wandboxCompiler: 'gcc-head',
    fileExtension: 'cpp',
    defaultCode: `// C++20 Playground
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> data = {10, 20, 30, 40, 50};
    int total = std::accumulate(data.begin(), data.end(), 0);
    
    std::cout << "{\\n"
              << "  \\"message\\": \\"Executed C++ successfully\\",\\n"
              << "  \\"total\\": " << total << ",\\n"
              << "  \\"count\\": " << data.size() << "\\n"
              << "}" << std::endl;
              
    return 0;
}
`
  },
  {
    id: 'c',
    name: 'C',
    icon: '🔧',
    aceMode: 'c_cpp',
    pistonLang: 'c',
    wandboxCompiler: 'gcc-head-c',
    fileExtension: 'c',
    defaultCode: `// C Standard Playground
#include <stdio.h>

int main(void) {
    printf("{\\n  \\"language\\": \\"C\\",\\n  \\"status\\": \\"active\\"\\n}\\n");
    return 0;
}
`
  },
  {
    id: 'go',
    name: 'Go',
    icon: '🐹',
    aceMode: 'golang',
    pistonLang: 'go',
    wandboxCompiler: 'go-1.23.2',
    fileExtension: 'go',
    defaultCode: `// Go Playground
package main

import (
	"encoding/json"
	"fmt"
)

type Response struct {
	Language string   \`json:"language"\`
	Features []string \`json:"features"\`
	Fast     bool     \`json:"fast"\`
}

func main() {
	res := Response{
		Language: "Go",
		Features: []string{"goroutines", "channels", "fast compilation"},
		Fast:     true,
	}

	out, _ := json.MarshalIndent(res, "", "  ")
	fmt.Println(string(out))
}
`
  }
];

/**
 * Get active Piston URL from localStorage or default
 */
export function getCustomPistonUrl() {
  return localStorage.getItem('piston_server_url') || DEFAULT_PISTON_URL;
}

/**
 * Set custom Piston URL in localStorage
 */
export function setCustomPistonUrl(url) {
  if (!url) {
    localStorage.removeItem('piston_server_url');
  } else {
    localStorage.setItem('piston_server_url', url.trim().replace(/\/$/, ''));
  }
}

function resolveEndpoint(baseUrl, path) {
  const cleanUrl = (baseUrl || '').replace(/\/$/, '');
  // If pointing to localhost:2000, use relative path so CRA dev proxy forwards it without CORS
  if (typeof window !== 'undefined' && (!cleanUrl || cleanUrl === 'http://localhost:2000' || cleanUrl === 'http://127.0.0.1:2000')) {
    return path;
  }
  return `${cleanUrl}${path}`;
}

/**
 * Health check for local/custom Piston instance
 */
export async function checkPistonHealth(customUrl = null) {
  const targetUrl = customUrl || getCustomPistonUrl();
  const endpoint = resolveEndpoint(targetUrl, '/api/v2/runtimes');
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const runtimes = await response.json();
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: true, latencyMs, runtimesCount: runtimes.length, runtimes };
    }
    return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'Timeout (server did not respond in 2.5s)' : err.message };
  }
}

/**
 * Execute code via local/custom Piston
 */
async function executeViaPiston(langConfig, code, stdin = '', pistonUrl) {
  const endpoint = resolveEndpoint(pistonUrl, '/api/v2/execute');
  const payload = {
    language: langConfig.pistonLang,
    version: '*',
    files: [
      {
        name: `main.${langConfig.fileExtension}`,
        content: code
      }
    ],
    stdin: stdin || ''
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Piston error (${response.status}): ${errText}`);
  }

  const result = await response.json();

  const compileError = result.compile && result.compile.code !== 0 ? (result.compile.stderr || result.compile.output) : '';
  const runStderr = result.run?.stderr || '';
  const runStdout = result.run?.stdout || (result.run?.output && !compileError ? result.run.output : '');
  const exitCode = result.compile && result.compile.code !== 0 ? result.compile.code : (result.run?.code ?? 0);

  return {
    stdout: runStdout,
    stderr: compileError ? compileError : runStderr,
    exitCode: exitCode,
    hasError: exitCode !== 0 || !!compileError
  };
}

/**
 * Execute code via public Wandbox fallback
 */
async function executeViaWandbox(langConfig, code, stdin = '') {
  // Java single-file runner on Wandbox saves as prog.java; non-public class allows any name
  let codeToRun = code;
  if (langConfig.id === 'java') {
    codeToRun = code.replace(/\bpublic\s+class\b/g, 'class');
  }

  const payload = {
    compiler: langConfig.wandboxCompiler,
    code: codeToRun,
    stdin: stdin || ''
  };

  const response = await fetch(WANDBOX_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Wandbox error (${response.status}): ${errorBody || response.statusText}`);
  }

  const result = await response.json();
  const exitCode = parseInt(result.status || '0', 10);
  const compilerErr = result.compiler_error || result.compiler_message || '';
  const programErr = result.program_error || '';
  const stdout = result.program_output || '';

  return {
    stdout: stdout,
    stderr: compilerErr ? compilerErr : programErr,
    exitCode: isNaN(exitCode) ? 0 : exitCode,
    hasError: exitCode !== 0 || (!!compilerErr && !stdout)
  };
}

let pistonOfflineUntil = 0;

/**
 * Main execution method: Tries local Piston first, automatically falls back to Wandbox
 */
export async function executeCode({ languageId, code, stdin = '', preferredEngine = 'auto' }) {
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.id === languageId) || SUPPORTED_LANGUAGES[0];
  const pistonUrl = getCustomPistonUrl();
  const startTime = performance.now();

  const isPistonTemporarilyDown = Date.now() < pistonOfflineUntil;

  // If user explicitly chose Wandbox OR Piston is known to be offline
  if (preferredEngine === 'wandbox' || (preferredEngine === 'auto' && isPistonTemporarilyDown)) {
    try {
      const res = await executeViaWandbox(langConfig, code, stdin);
      const executionTimeMs = Math.round(performance.now() - startTime);
      return { 
        ...res, 
        executionTimeMs, 
        engine: 'wandbox',
        warning: isPistonTemporarilyDown ? 'Local Piston is stopped. Executing via Cloud Engine.' : undefined
      };
    } catch (err) {
      if (preferredEngine === 'wandbox') {
        return {
          stdout: '',
          stderr: `Cloud Execution Error: ${err.message}`,
          exitCode: 1,
          executionTimeMs: Math.round(performance.now() - startTime),
          engine: 'wandbox',
          hasError: true
        };
      }
      // If auto, try Piston below as retry
    }
  }

  // Otherwise, try Piston first
  try {
    const res = await executeViaPiston(langConfig, code, stdin, pistonUrl);
    pistonOfflineUntil = 0; // Reset offline state on success
    const executionTimeMs = Math.round(performance.now() - startTime);
    return { ...res, executionTimeMs, engine: 'piston' };
  } catch (pistonErr) {
    pistonOfflineUntil = Date.now() + 30000; // Cache offline for 30s so subsequent runs are instant
    // If user explicitly chose Piston only (no fallback)
    if (preferredEngine === 'piston') {
      return {
        stdout: '',
        stderr: `Piston Server Error (${pistonUrl}):\n${pistonErr.message}\n\nPlease check if Docker/Piston is running.`,
        exitCode: 1,
        executionTimeMs: Math.round(performance.now() - startTime),
        engine: 'piston',
        hasError: true
      };
    }

    // Auto mode: Fall back seamlessly to Wandbox
    console.warn(`Piston at ${pistonUrl} unreachable, falling back to Wandbox:`, pistonErr.message);
    try {
      const res = await executeViaWandbox(langConfig, code, stdin);
      const executionTimeMs = Math.round(performance.now() - startTime);
      return {
        ...res,
        executionTimeMs,
        engine: 'wandbox (fallback)',
        warning: `Local Piston at ${pistonUrl} was unreachable. Executed via Cloud Fallback Engine.`
      };
    } catch (fallbackErr) {
      return {
        stdout: '',
        stderr: `Both Piston and Fallback engine failed:\n• Piston: ${pistonErr.message}\n• Fallback: ${fallbackErr.message}`,
        exitCode: 1,
        executionTimeMs: Math.round(performance.now() - startTime),
        engine: 'none',
        hasError: true
      };
    }
  }
}
