import { prisma } from './index';

const languages = [
  {
    name: 'JavaScript',
    version: '18.x',
    dockerImage: 'node:18-alpine',
    defaultTimeLimitMs: 5000,
    defaultMemoryLimitMb: 256,
    defaultOutputLimitBytes: 1048576,
  },
  {
    name: 'TypeScript',
    version: '5.x',
    dockerImage: 'node:18-alpine',
    defaultTimeLimitMs: 5000,
    defaultMemoryLimitMb: 256,
    defaultOutputLimitBytes: 1048576,
  },
  {
    name: 'Python',
    version: '3.11',
    dockerImage: 'python:3.11-slim',
    defaultTimeLimitMs: 5000,
    defaultMemoryLimitMb: 256,
    defaultOutputLimitBytes: 1048576,
  },
  {
    name: 'C++',
    version: '11',
    dockerImage: 'gcc:11',
    defaultTimeLimitMs: 5000,
    defaultMemoryLimitMb: 256,
    defaultOutputLimitBytes: 1048576,
  },
  {
    name: 'Java',
    version: '21',
    dockerImage: 'eclipse-temurin:21-jdk',
    defaultTimeLimitMs: 5000,
    defaultMemoryLimitMb: 512,
    defaultOutputLimitBytes: 1048576,
  },
  {
    name: 'Go',
    version: '1.22',
    dockerImage: 'golang:1.22-alpine',
    defaultTimeLimitMs: 5000,
    defaultMemoryLimitMb: 256,
    defaultOutputLimitBytes: 1048576,
  },
];

const challenges = [
  {
    title: 'Two Sum',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

**Example 3:**
\`\`\`
Input: nums = [3,3], target = 6
Output: [0,1]
\`\`\`

**Constraints:**
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- Only one valid answer exists.`,
    difficulty: 'EASY',
    languageName: 'JavaScript',
    timeLimitMs: 5000,
    memoryLimitMb: 256,
    outputLimitBytes: 1048576,
    starterCodeMap: {
      JavaScript: `function twoSum(nums, target) {
  // Your code here
}

const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));
const nums = input.nums;
const target = input.target;
const result = twoSum(nums, target);
console.log(JSON.stringify(result));`,
      Python: `def twoSum(nums, target):
    # Your code here
    pass

import json
import sys

input_data = json.load(sys.stdin)
nums = input_data["nums"]
target = input_data["target"]
result = twoSum(nums, target)
print(json.dumps(result))`,
      TypeScript: `function twoSum(nums: number[], target: number): number[] {
  // Your code here
  return [];
}

const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));
const nums: number[] = input.nums;
const target: number = input.target;
const result: number[] = twoSum(nums, target);
console.log(JSON.stringify(result));`,
    },
    testCases: [
      {
        input: '{"nums":[2,7,11,15],"target":9}',
        expectedOutput: '[0,1]',
        isPublic: true,
      },
      {
        input: '{"nums":[3,2,4],"target":6}',
        expectedOutput: '[1,2]',
        isPublic: true,
      },
      {
        input: '{"nums":[3,3],"target":6}',
        expectedOutput: '[0,1]',
        isPublic: true,
      },
      {
        input: '{"nums":[-1,-2,-3,-4,-5],"target":-8}',
        expectedOutput: '[2,4]',
        isPublic: false,
      },
      {
        input: '{"nums":[1,2,3,4,5],"target":9}',
        expectedOutput: '[3,4]',
        isPublic: false,
      },
      {
        input: '{"nums":[0,4,3,0],"target":0}',
        expectedOutput: '[0,3]',
        isPublic: false,
      },
      {
        input: '{"nums":[-3,4,3,90],"target":0}',
        expectedOutput: '[0,2]',
        isPublic: false,
      },
    ],
  },
  {
    title: 'Hello World',
    description: `Write a program that prints "Hello, World!" to standard output.

This is the classic first program for beginners. Your program should output exactly:
\`\`\`
Hello, World!
\`\`\`

**Constraints:**
- No input
- Output must match exactly (including capitalization and punctuation)`,
    difficulty: 'EASY',
    languageName: 'JavaScript',
    timeLimitMs: 1000,
    memoryLimitMb: 64,
    outputLimitBytes: 1048576,
    starterCodeMap: {
      JavaScript: `// Your code here
console.log("Hello, World!");`,
      Python: `# Your code here
print("Hello, World!")`,
      TypeScript: `// Your code here
console.log("Hello, World!");`,
    },
    testCases: [
      { input: '{}', expectedOutput: 'Hello, World!', isPublic: true },
      { input: '{}', expectedOutput: 'Hello, World!', isPublic: false },
    ],
  },
  {
    title: 'Reverse String',
    description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`.

You must do this by modifying the input array in-place with \`O(1)\` extra memory.

**Example 1:**
\`\`\`
Input: s = ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]
\`\`\`

**Example 2:**
\`\`\`
Input: s = ["H","a","n","n","a","h"]
Output: ["h","a","n","n","a","H"]
\`\`\`

**Constraints:**
- \`1 <= s.length <= 10^5\`
- \`s[i]\` is a printable ASCII character.`,
    difficulty: 'EASY',
    languageName: 'JavaScript',
    timeLimitMs: 5000,
    memoryLimitMb: 256,
    outputLimitBytes: 1048576,
    starterCodeMap: {
      JavaScript: `function reverseString(s) {
  // Your code here
}

const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));
const s = input.s;
reverseString(s);
console.log(JSON.stringify(s));`,
      Python: `def reverseString(s):
    # Your code here
    pass

import json
import sys

input_data = json.load(sys.stdin)
s = input_data["s"]
reverseString(s)
print(json.dumps(s))`,
      TypeScript: `function reverseString(s: string[]): void {
  // Your code here
}

const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));
const s: string[] = input.s;
reverseString(s);
console.log(JSON.stringify(s));`,
    },
    testCases: [
      {
        input: '{"s":["h","e","l","l","o"]}',
        expectedOutput: '["o","l","l","e","h"]',
        isPublic: true,
      },
      {
        input: '{"s":["H","a","n","n","a","h"]}',
        expectedOutput: '["h","a","n","n","a","H"]',
        isPublic: true,
      },
      { input: '{"s":["a"]}', expectedOutput: '["a"]', isPublic: false },
      {
        input: '{"s":["a","b"]}',
        expectedOutput: '["b","a"]',
        isPublic: false,
      },
    ],
  },
  {
    title: 'Valid Parentheses',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:**
\`\`\`
Input: s = "()"
Output: true
\`\`\`

**Example 2:**
\`\`\`
Input: s = "()[]{}"
Output: true
\`\`\`

**Example 3:**
\`\`\`
Input: s = "(]"
Output: false
\`\`\`

**Example 4:**
\`\`\`
Input: s = "([])"
Output: true
\`\`\`

**Constraints:**
- \`1 <= s.length <= 10^4\`
- \`s\` consists of parentheses only \`'()[]{}'\`.`,
    difficulty: 'EASY',
    languageName: 'JavaScript',
    timeLimitMs: 5000,
    memoryLimitMb: 256,
    outputLimitBytes: 1048576,
    starterCodeMap: {
      JavaScript: `function isValid(s) {
  // Your code here
}

const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));
const s = input.s;
const result = isValid(s);
console.log(JSON.stringify(result));`,
      Python: `def isValid(s):
    # Your code here
    pass

import json
import sys

input_data = json.load(sys.stdin)
s = input_data["s"]
result = isValid(s)
print(json.dumps(result))`,
      TypeScript: `function isValid(s: string): boolean {
  // Your code here
  return false;
}

const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));
const s: string = input.s;
const result: boolean = isValid(s);
console.log(JSON.stringify(result));`,
    },
    testCases: [
      { input: '{"s":"()"}', expectedOutput: 'true', isPublic: true },
      { input: '{"s":"()[]{}"}', expectedOutput: 'true', isPublic: true },
      { input: '{"s":"(]"}', expectedOutput: 'false', isPublic: true },
      { input: '{"s":"([])"}', expectedOutput: 'true', isPublic: false },
      { input: '{"s":"([)]"}', expectedOutput: 'false', isPublic: false },
      { input: '{"s":"{[]}"}', expectedOutput: 'true', isPublic: false },
      { input: '{"s":"("}', expectedOutput: 'false', isPublic: false },
      { input: '{"s":")"}', expectedOutput: 'false', isPublic: false },
    ],
  },
  {
    title: 'Binary Search',
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.

**Example 1:**
\`\`\`
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4
Explanation: 9 exists in nums and its index is 4
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [-1,0,3,5,9,12], target = 2
Output: -1
Explanation: 2 does not exist in nums so return -1
\`\`\`

**Constraints:**
- \`1 <= nums.length <= 10^4\`
- \`-10^4 < nums[i], target < 10^4\`
- All the integers in \`nums\` are unique.
- \`nums\` is sorted in ascending order.`,
    difficulty: 'EASY',
    languageName: 'JavaScript',
    timeLimitMs: 5000,
    memoryLimitMb: 256,
    outputLimitBytes: 1048576,
    starterCodeMap: {
      JavaScript: `function search(nums, target) {
  // Your code here
}

const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));
const nums = input.nums;
const target = input.target;
const result = search(nums, target);
console.log(JSON.stringify(result));`,
      Python: `def search(nums, target):
    # Your code here
    pass

import json
import sys

input_data = json.load(sys.stdin)
nums = input_data["nums"]
target = input_data["target"]
result = search(nums, target)
print(json.dumps(result))`,
      TypeScript: `function search(nums: number[], target: number): number {
  // Your code here
  return -1;
}

const input = JSON.parse(require('fs').readFileSync('/tmp/input.txt', 'utf-8'));
const nums: number[] = input.nums;
const target: number = input.target;
const result: number = search(nums, target);
console.log(JSON.stringify(result));`,
    },
    testCases: [
      {
        input: '{"nums":[-1,0,3,5,9,12],"target":9}',
        expectedOutput: '4',
        isPublic: true,
      },
      {
        input: '{"nums":[-1,0,3,5,9,12],"target":2}',
        expectedOutput: '-1',
        isPublic: true,
      },
      {
        input: '{"nums":[5],"target":5}',
        expectedOutput: '0',
        isPublic: false,
      },
      {
        input: '{"nums":[5],"target":-5}',
        expectedOutput: '-1',
        isPublic: false,
      },
      {
        input: '{"nums":[-1,0,3,5,9,12],"target":12}',
        expectedOutput: '5',
        isPublic: false,
      },
      {
        input: '{"nums":[-1,0,3,5,9,12],"target":-1}',
        expectedOutput: '0',
        isPublic: false,
      },
    ],
  },
];

async function upsertLanguage(data) {
  // Find existing language by name + version
  const existing = await prisma.language.findFirst({
    where: { name: data.name, version: data.version },
  });

  if (existing) {
    return prisma.language.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.language.create({ data });
}

async function upsertChallenge(data, languageId) {
  const { starterCodeMap, testCases, languageName, ...challengeData } = data;
  const starterCode =
    starterCodeMap[languageName] || starterCodeMap.JavaScript || '';

  // Find existing challenge by title + languageId
  const existing = await prisma.challenge.findFirst({
    where: { title: challengeData.title, languageId },
  });

  let challenge: Awaited<ReturnType<typeof prisma.challenge.create>>;
  if (existing) {
    challenge = await prisma.challenge.update({
      where: { id: existing.id },
      data: {
        ...challengeData,
        languageId,
        starterCode,
      },
    });
  } else {
    challenge = await prisma.challenge.create({
      data: {
        ...challengeData,
        languageId,
        starterCode,
      },
    });
  }

  // Delete existing test cases and create new ones
  await prisma.testCase.deleteMany({ where: { challengeId: challenge.id } });

  await prisma.testCase.createMany({
    data: testCases.map((tc) => ({
      challengeId: challenge.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isPublic: tc.isPublic,
    })),
  });

  return challenge;
}

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Languages
  console.log('📦 Seeding languages...');
  const languageMap = new Map();
  for (const lang of languages) {
    const created = await upsertLanguage(lang);
    languageMap.set(`${lang.name}:${lang.version}`, created.id);
    console.log(`  ✓ ${lang.name} ${lang.version}`);
  }

  // 2. Seed Challenges
  console.log('📝 Seeding challenges...');
  for (const challenge of challenges) {
    const languageId = languageMap.get(
      `${challenge.languageName}:${languages.find((l) => l.name === challenge.languageName)?.version}`
    );
    if (!languageId) {
      console.error(`  ✗ Language not found for challenge: ${challenge.title}`);
      continue;
    }
    await upsertChallenge(challenge, languageId);
    console.log(`  ✓ ${challenge.title} (${challenge.languageName})`);
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
