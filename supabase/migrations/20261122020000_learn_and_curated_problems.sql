-- Database-backed Learn chapters, student Learn progress, and curated Easy -> Hard problems with labels.
-- Paste into the Supabase SQL Editor once.

-- 1. Learn chapters table (optional DB overrides/additions on top of curriculum defaults)
create table if not exists learn_chapters (
  id text primary key,
  order_index int not null default 1,
  number text not null,
  title text not null,
  short_title text not null,
  category text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  tags text[] not null default '{}',
  summary text not null,
  lessons jsonb not null,
  created_at timestamptz not null default now()
);

alter table learn_chapters enable row level security;
revoke all on learn_chapters from anon, authenticated;
grant all on learn_chapters to service_role;

-- 2. Student Learn progress table (persists completed chapters & exercises per language in Supabase)
create table if not exists learn_progress (
  user_id text not null references profiles on delete cascade,
  chapter_id text not null,
  language text not null check (language in ('python', 'java', 'cpp', 'c')),
  completed_at timestamptz not null default now(),
  primary key (user_id, chapter_id, language)
);

create index if not exists learn_progress_user_idx on learn_progress (user_id);

alter table learn_progress enable row level security;
revoke all on learn_progress from anon, authenticated;
grant all on learn_progress to service_role;

-- 3. Remove any legacy dummy problems if they were previously inserted
delete from class_problems where problem_id in ('hello-world', 'sum-two-integers', 'even-or-odd');
delete from problems where id in ('hello-world', 'sum-two-integers', 'even-or-odd');

-- 4. Seed curated Easy (beginner), Medium (intermediate), and Hard (advanced) problems with topic labels (no answers/spoilers in problem statements)
insert into problems (
  id,
  title,
  description,
  difficulty,
  category,
  tags,
  supported_languages,
  input_spec,
  output_spec,
  constraints,
  test_cases,
  time_limit_ms,
  memory_limit_kb
)
values
  -- ==========================================
  -- EASY (beginner)
  -- ==========================================
  (
    'array-elements-sum',
    'Array Elements Sum',
    'Given an array of N integers, compute and print the sum of all elements in the array.',
    'beginner',
    'Arrays & Traversal',
    array['array', 'math', 'basics'],
    array['python', 'java', 'cpp', 'c'],
    'The first line contains an integer N (the number of elements). The second line contains N space-separated integers.',
    'Print a single integer representing the sum of the N elements.',
    array['1 <= N <= 10^5', '-10^9 <= A[i] <= 10^9'],
    '[
      {"id": "aes-1", "input": "5\n10 20 30 40 50", "expectedOutput": "150", "isHidden": false},
      {"id": "aes-2", "input": "4\n-5 12 -3 8", "expectedOutput": "12", "isHidden": false},
      {"id": "aes-3", "input": "1\n42", "expectedOutput": "42", "isHidden": true},
      {"id": "aes-4", "input": "6\n1000000000 1000000000 1000000000 -500000000 0 250000000", "expectedOutput": "2750000000", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  ),
  (
    'palindrome-word',
    'Palindrome Word Check',
    'A palindrome is a word that reads the same backward as forward. Given a single lowercase string S, print YES if S is a palindrome, or NO otherwise.',
    'beginner',
    'Strings & Conditionals',
    array['string', 'conditionals', 'basics'],
    array['python', 'java', 'cpp', 'c'],
    'A single line containing a non-empty lowercase string S consisting of letters a-z.',
    'Print YES if S is a palindrome, or NO if it is not.',
    array['1 <= |S| <= 10^5', 'S contains only lowercase English letters (a-z).'],
    '[
      {"id": "pw-1", "input": "racecar", "expectedOutput": "YES", "isHidden": false},
      {"id": "pw-2", "input": "exeku", "expectedOutput": "NO", "isHidden": false},
      {"id": "pw-3", "input": "level", "expectedOutput": "YES", "isHidden": true},
      {"id": "pw-4", "input": "a", "expectedOutput": "YES", "isHidden": true},
      {"id": "pw-5", "input": "abca", "expectedOutput": "NO", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  ),
  (
    'fizz-buzz-sequence',
    'FizzBuzz Sequence',
    'Given a positive integer N, print the tokens for numbers from 1 to N separated by spaces on a single line: print FizzBuzz if a number is divisible by both 3 and 5, Fizz if divisible by 3 only, Buzz if divisible by 5 only, or the number itself otherwise.',
    'beginner',
    'Conditionals & Loops',
    array['conditionals', 'math', 'basics'],
    array['python', 'java', 'cpp', 'c'],
    'A single line containing one integer N.',
    'Print N space-separated tokens on a single line corresponding to 1 through N.',
    array['1 <= N <= 10^4'],
    '[
      {"id": "fb-1", "input": "5", "expectedOutput": "1 2 Fizz 4 Buzz", "isHidden": false},
      {"id": "fb-2", "input": "15", "expectedOutput": "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz", "isHidden": false},
      {"id": "fb-3", "input": "1", "expectedOutput": "1", "isHidden": true},
      {"id": "fb-4", "input": "3", "expectedOutput": "1 2 Fizz", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  ),

  -- ==========================================
  -- MEDIUM (intermediate)
  -- ==========================================
  (
    'two-sum-target',
    'Two Sum Indices',
    'Given an array of N integers and a target sum T, find two distinct 0-based indices i and j (with i < j) such that A[i] + A[j] = T. Print the pair i j, or -1 if no such pair exists. If multiple pairs exist, print the one with the smallest second index j (and smallest i on ties).',
    'intermediate',
    'Hash Table & Arrays',
    array['array', 'hash-table'],
    array['python', 'java', 'cpp', 'c'],
    'The first line contains two space-separated integers N and T. The second line contains N space-separated integers.',
    'Print two space-separated 0-based indices i and j (i < j), or -1 if no two elements sum to T.',
    array['2 <= N <= 10^5', '-10^9 <= A[i], T <= 10^9'],
    '[
      {"id": "ts-1", "input": "4 9\n2 7 11 15", "expectedOutput": "0 1", "isHidden": false},
      {"id": "ts-2", "input": "5 6\n3 2 4 8 1", "expectedOutput": "1 2", "isHidden": false},
      {"id": "ts-3", "input": "3 10\n1 2 3", "expectedOutput": "-1", "isHidden": true},
      {"id": "ts-4", "input": "4 -2\n-5 3 1 -3", "expectedOutput": "0 1", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  ),
  (
    'rotate-array-steps',
    'Rotate Array Right by K',
    'Given an array of N integers and a non-negative integer K, rotate the array to the right by K steps (where each step moves the last element to the front) and print the resulting space-separated array.',
    'intermediate',
    'Arrays & Modulo',
    array['array', 'math'],
    array['python', 'java', 'cpp', 'c'],
    'The first line contains two space-separated integers N and K. The second line contains N space-separated integers.',
    'Print the N space-separated integers after rotating right by K steps.',
    array['1 <= N <= 10^5', '0 <= K <= 10^9'],
    '[
      {"id": "ra-1", "input": "5 2\n10 20 30 40 50", "expectedOutput": "40 50 10 20 30", "isHidden": false},
      {"id": "ra-2", "input": "4 6\n1 2 3 4", "expectedOutput": "3 4 1 2", "isHidden": false},
      {"id": "ra-3", "input": "3 0\n7 8 9", "expectedOutput": "7 8 9", "isHidden": true},
      {"id": "ra-4", "input": "5 5\n1 2 3 4 5", "expectedOutput": "1 2 3 4 5", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  ),
  (
    'valid-anagram-pair',
    'Valid Anagram Pair',
    'Two strings S and T are anagrams if T can be formed by rearranging the letters of S using every original letter exactly once. Given two lowercase strings S and T, print YES if they are anagrams, or NO otherwise.',
    'intermediate',
    'Strings & Sorting',
    array['string', 'sorting', 'hash-table'],
    array['python', 'java', 'cpp', 'c'],
    'Two lines: the first line contains lowercase string S, and the second line contains lowercase string T.',
    'Print YES if S and T are anagrams of each other, or NO otherwise.',
    array['1 <= |S|, |T| <= 10^5', 'S and T consist of lowercase English letters (a-z).'],
    '[
      {"id": "va-1", "input": "listen\nsilent", "expectedOutput": "YES", "isHidden": false},
      {"id": "va-2", "input": "algorithm\nlogarithm", "expectedOutput": "YES", "isHidden": false},
      {"id": "va-3", "input": "rat\ncar", "expectedOutput": "NO", "isHidden": true},
      {"id": "va-4", "input": "aabb\nabb", "expectedOutput": "NO", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  ),

  -- ==========================================
  -- HARD (advanced)
  -- ==========================================
  (
    'maximum-subarray-sum',
    'Maximum Subarray Sum',
    'Given an array of N integers (which may include negative numbers), find the contiguous non-empty subarray with the largest possible sum and print that maximum sum.',
    'advanced',
    'Dynamic Programming & Arrays',
    array['array', 'math'],
    array['python', 'java', 'cpp', 'c'],
    'The first line contains an integer N. The second line contains N space-separated integers.',
    'Print a single integer: the maximum sum of any non-empty contiguous subarray.',
    array['1 <= N <= 10^5', '-10^9 <= A[i] <= 10^9'],
    '[
      {"id": "ms-1", "input": "9\n-2 1 -3 4 -1 2 1 -5 4", "expectedOutput": "6", "isHidden": false},
      {"id": "ms-2", "input": "5\n5 4 -1 7 8", "expectedOutput": "23", "isHidden": false},
      {"id": "ms-3", "input": "4\n-8 -3 -6 -2", "expectedOutput": "-2", "isHidden": true},
      {"id": "ms-4", "input": "1\n-15", "expectedOutput": "-15", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  ),
  (
    'longest-unique-substring',
    'Longest Substring Without Repeating Characters',
    'Given a non-empty string S consisting of visible ASCII characters (no spaces), find the length of the longest contiguous substring that contains no repeated characters.',
    'advanced',
    'Sliding Window & Strings',
    array['string', 'hash-table'],
    array['python', 'java', 'cpp', 'c'],
    'A single line containing a non-empty string S without spaces.',
    'Print a single integer: the maximum length of a substring of S with all distinct characters.',
    array['1 <= |S| <= 10^5'],
    '[
      {"id": "lus-1", "input": "abcabcbb", "expectedOutput": "3", "isHidden": false},
      {"id": "lus-2", "input": "pwwkew", "expectedOutput": "3", "isHidden": false},
      {"id": "lus-3", "input": "bbbbbb", "expectedOutput": "1", "isHidden": true},
      {"id": "lus-4", "input": "exekuplatform", "expectedOutput": "11", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  ),
  (
    'merge-overlapping-intervals',
    'Merge Overlapping Intervals',
    'Given N closed intervals [L_i, R_i], merge all overlapping or touching intervals (where two intervals [a, b] and [c, d] with a <= c overlap if c <= b) and print the merged intervals sorted by start point, one interval per line.',
    'advanced',
    'Sorting & Intervals',
    array['array', 'sorting'],
    array['python', 'java', 'cpp', 'c'],
    'The first line contains an integer N. Each of the next N lines contains two space-separated integers L_i and R_i (L_i <= R_i).',
    'Print the merged intervals sorted in ascending order of their start point, one per line as "L R".',
    array['1 <= N <= 10^5', '-10^9 <= L_i <= R_i <= 10^9'],
    '[
      {"id": "moi-1", "input": "4\n1 3\n2 6\n8 10\n15 18", "expectedOutput": "1 6\n8 10\n15 18", "isHidden": false},
      {"id": "moi-2", "input": "2\n1 4\n4 5", "expectedOutput": "1 5", "isHidden": false},
      {"id": "moi-3", "input": "3\n5 10\n1 3\n2 4", "expectedOutput": "1 4\n5 10", "isHidden": true},
      {"id": "moi-4", "input": "3\n1 10\n2 5\n6 9", "expectedOutput": "1 10", "isHidden": true}
    ]'::jsonb,
    2000,
    128000
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  category = excluded.category,
  tags = excluded.tags,
  supported_languages = excluded.supported_languages,
  input_spec = excluded.input_spec,
  output_spec = excluded.output_spec,
  constraints = excluded.constraints,
  test_cases = excluded.test_cases,
  time_limit_ms = excluded.time_limit_ms,
  memory_limit_kb = excluded.memory_limit_kb;
