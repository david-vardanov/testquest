# TestQuest Tester Guide

A complete guide for testers using the TestQuest gamified testing platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Dashboard](#understanding-the-dashboard)
3. [Completing Test Flows](#completing-test-flows)
4. [Submitting Test Results](#submitting-test-results)
5. [Point System](#point-system)
6. [Viewing Your Submissions](#viewing-your-submissions)
7. [Leaderboard & Rankings](#leaderboard--rankings)
8. [Rewards & Seasons](#rewards--seasons)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

---

## Getting Started

### Receiving Your Credentials

Your administrator will create an account for you and provide:

- **Username**: Your unique login name (this will appear on the leaderboard)
- **Password**: Your initial password

Keep these credentials secure. Contact your administrator if you need your password reset.

### Logging In

1. Enter your **username** and **password**
2. Click **Login**
3. You'll be taken to your tester dashboard

### Session Information

- Your session remains active for 24 hours
- If you're inactive for an extended period, you may need to log in again

---

## Understanding the Dashboard

After logging in, you'll see your main dashboard with several key sections:

### Available Flows

The main area displays all active test flows available for testing. Each flow card shows:

- **Flow Name**: The name of the testing scenario
- **Description**: Brief explanation of what the flow tests
- **Test Cases**: Number of test cases in the flow
- **Points**: Total points available for completing this flow
- **Your Progress**: How many test cases you've completed

### Your Stats

Located prominently on your dashboard:

- **Current Points**: Your total accumulated points
- **Current Rank**: Your position on the leaderboard
- **Current Reward Tier**: What prize tier you're currently in (if applicable)
- **Next Reward Target**: Points/position needed for the next reward tier

### Leaderboard Preview

A snapshot of the all testers and your current position

### Season History Link

Quick link to view your past season results and rewards.

---

## Completing Test Flows

### Starting a Flow

1. From your dashboard, browse the available test flows
2. Click on a flow to begin testing
3. You'll see the first (or next incomplete) test case

### Understanding Test Cases

Each test case contains:

- **Title**: Name of the specific test scenario
- **Description**: What this test is checking
- **Scenario/Steps**: Step-by-step instructions to follow
- **Expected Result**: What should happen if everything works correctly

### Working Through a Flow

1. **Read the test case carefully** - understand what you need to test
2. **Follow the scenario steps exactly** as written
3. **Compare the actual result** to the expected result
4. **Submit your results** (see next section)
5. **Continue to the next test case** until the flow is complete

### Flow Completion

When you complete all test cases in a flow:

- You'll see a "Flow Complete" confirmation page
- If all your submissions are approved, you'll receive a **completion bonus** (typically 3 extra points)
- You can return to the dashboard to start another flow

---

## Submitting Test Results

After completing a test case, you need to submit your results.

### Status Selection

Choose one of two options:

**Passed**

- Select this if the application behaved as expected
- The actual result matched the expected result
- Base points: 1 point

**Failed (Bug Found)**

- Select this if you found a bug or unexpected behavior
- The actual result did NOT match the expected result
- Base points: 1 point + 3 bonus points = 4 points

### Adding Feedback (Optional but Recommended)

The feedback field allows you to provide additional context:

- **For passed tests**: Note any observations, minor issues, or suggestions
- **For failed tests**: Describe the bug in detail
  - What happened?
  - What did you expect?
  - Any error messages?
  - Steps to reproduce

Adding feedback earns you **+1 point**.

### Attaching Screenshots (Optional but Recommended)

Upload a screenshot as evidence:

- **For passed tests**: Show the successful state
- **For failed tests**: Capture the bug/error

Screenshot requirements:

- Supported formats: PNG, JPG, GIF
- Clearly shows the relevant area
- Include error messages if applicable

Attaching a screenshot earns you **+1 point**.

### Submission Review

After submitting:

- Your submission enters a **pending** state
- An administrator will review your submission
- Points are awarded once approved
- You can continue testing while waiting for approval

---

## Point System

Understanding how points work will help you maximize your score.

### Points Breakdown

| Action                     | Points    | Notes                                             |
| -------------------------- | --------- | ------------------------------------------------- |
| Complete a test case       | Varies\*  | Base points depend on test case difficulty        |
| Find a bug (Failed status) | +3        | Only when you genuinely find an issue             |
| Provide feedback           | +1        | Any meaningful feedback text                      |
| Attach screenshot          | +1        | Valid screenshot evidence                         |
| Useful feedback bonus      | +1        | Admin marks your feedback as particularly helpful |
| Flow completion bonus      | +3\*\*    | Awarded when all tests in a flow are approved     |

\*Each test case has a base point value set by the administrator based on complexity/difficulty. Simple tests may be worth 1 point, while complex tests could be worth more.

\*\*Flow completion bonus may vary per flow.

### Understanding Flow Points

Each flow displays a total point value (e.g., "50 pts"). This represents the sum of:
- Base points for all test cases in the flow
- The flow completion bonus

Different flows have different point totals based on:
- Number of test cases
- Difficulty of individual test cases
- Flow completion bonus amount

### Maximum Points Per Submission

A single submission can earn the **base points + up to 6 bonus points**:

- Base (varies) + 3 (bug) + 1 (feedback) + 1 (screenshot) + 1 (useful feedback)

### Point Approval Process

1. You submit a test result → Points are calculated but pending
2. Admin reviews your submission
3. Admin can:
   - **Approve**: All calculated points are awarded
   - **Partially approve**: Some point components may be rejected
   - **Request rerun**: You can retake the test while keeping your previous points. You can earn additional points on the retake.
   - **Reset**: Submission removed and points deducted (rare, for invalid submissions)

### Why Points Might Be Rejected

Individual point components can be rejected if:

- **Bug points rejected**: The "bug" was user error or not reproducible
- **Feedback points rejected**: Feedback was not meaningful or relevant
- **Screenshot points rejected**: Screenshot doesn't show relevant information

---

## Viewing Your Submissions

### Accessing Submission History

1. Click **My Submissions** in the navigation menu
2. View all your past submissions sorted by date (newest first)

### Submission Details

Each submission shows:

- **Test Case**: Which test you completed
- **Flow**: Which flow it belongs to
- **Status**: Passed or Failed
- **Points Earned**: Calculated points for this submission
- **Approval Status**: Pending, Approved, or specific rejections
- **Feedback**: Your comments (if provided)
- **Screenshot**: Your uploaded image (if provided)
- **Admin Notes**: Any feedback from the administrator

### Understanding Approval Status

- **Pending**: Awaiting admin review
- **Approved**: Points have been credited to your account
- **Partially Approved**: Some point components were rejected (see which ones)

---

## Leaderboard & Rankings

### Viewing the Leaderboard

1. Click **Leaderboard** in the navigation menu
2. See all testers ranked by total points

### Leaderboard Information

- **Rank**: Position on the leaderboard
- **Username**: Tester's name
- **Points**: Total accumulated points
- **Reward**: The prize you'll receive based on your current position
- **Your Position**: Highlighted in the list

### Improving Your Rank

- Complete more test flows
- Always provide detailed feedback
- Always attach screenshots
- Focus on quality to avoid rejections
- Find genuine bugs for bonus points

---

## Rewards & Seasons

TestQuest uses a position-based reward system organized by seasons.

### How Rewards Work

1. Rewards are tied to leaderboard positions (not point thresholds)
2. Example reward tiers:
   - 1st place: $100 gift card
   - 2nd-3rd place: $50 gift card
   - 4th-10th place: $25 gift card
3. Your dashboard and leaderboard show your current tier based on your position
4. All testers receive rewards based on their final position when the season ends

### Seasons

Testing is organized into seasons. Each season:

- Has a name and end date set by administrators
- Tracks all tester points during that period
- Ends when the administrator closes the season
- Results in a frozen leaderboard snapshot

When a season closes:

- The leaderboard is archived permanently
- All user points reset to 0
- A new season begins

### Viewing Season History

1. Click **History** in the navigation menu
2. See all past seasons you participated in
3. View your final position and reward for each season
4. Click on any season to see the complete archived leaderboard

### Checking Your Reward Status

Your dashboard displays:

- Current reward tier (based on your rank)
- Prize description for your tier
- Next reward tier and positions needed to reach it

Rewards are distributed by your administrator outside the application after each season ends.

---

## Best Practices

### For Maximizing Points

1. **Always provide feedback** - Even for passed tests, note your observations
2. **Always attach screenshots** - Visual evidence is valuable
3. **Be thorough** - Detailed bug reports are more likely to be approved
4. **Complete entire flows** - Earn the completion bonus
5. **Quality over speed** - Rejected submissions waste time

### For Effective Bug Reporting

When you find a bug, your feedback should include:

1. **Steps to reproduce**

   ```
   1. Navigate to [page]
   2. Click [button]
   3. Enter [value]
   4. Click [submit]
   ```

2. **Expected behavior**

   - What should have happened

3. **Actual behavior**

   - What actually happened

4. **Environment** (if relevant)

   - Browser type and version
   - Device type
   - Any other relevant context

5. **Screenshot**
   - Capture the error state
   - Include any error messages
   - Highlight the problem area if possible

### For Quality Screenshots

- Capture the full relevant area
- Include error messages in the frame
- Use annotations/highlights if helpful
- Ensure text is readable
- Avoid capturing sensitive information

### General Tips

- **Read test cases completely** before starting
- **Follow steps exactly** as written
- **Don't rush** - missed details lead to invalid submissions
- **Test genuinely** - Don't mark tests as failed just for bonus points
- **Check your submissions** - Review pending items regularly

---

## FAQ

### Q: How long until my submission is approved?

Approval time depends on admin availability. Continue testing while waiting - points will be credited once approved.

### Q: What if I made a mistake in my submission?

Contact your administrator. They can reset the submission and allow you to retake the test.

### Q: Can I redo a test case?

Only if an admin grants a rerun. You cannot retake tests on your own once submitted. When a rerun is granted, you keep your previous points and can earn additional points on the retake.

### Q: Why were some of my points rejected?

Admins may reject specific point components (bug, feedback, or screenshot points) if they don't meet quality standards. Your base test completion point is usually still awarded.

### Q: How is my rank calculated?

Rank is based solely on total approved points. Higher points = higher rank.

### Q: What happens if I tie with another tester?

Testers with the same points share the same effective rank for reward purposes.

### Q: Can I test the same flow multiple times?

Once a flow is completed, you cannot retake it unless an admin resets your progress.

### Q: Do I lose points if a bug I reported isn't valid?

You won't lose points, but the bug bonus (+3) may not be awarded. Your base completion point is typically still credited.

### Q: How do I know what reward tier I'm in?

Check your dashboard - it displays your current reward tier based on your leaderboard position.

### Q: When are rewards distributed?

Rewards are distributed by administrators at the end of each season. Your administrator will communicate when rewards are available.

### Q: What happens when a season ends?

When the administrator closes a season:
- The current leaderboard is saved as a permanent archive
- All user points reset to 0
- A new season begins immediately
- You can view your past results in the History section

### Q: Where can I see my past season results?

Click **History** in the navigation menu to see all past seasons, your final positions, and what rewards you earned.

### Q: Do my points carry over between seasons?

No, points reset to 0 when a new season begins. Each season is a fresh start for everyone.

---

## Need Help?

If you encounter any issues or have questions:

1. Check this guide for answers
2. Contact your administrator
3. Report technical bugs through appropriate channels

---

Happy Testing! May your bugs be plentiful and your points be high.
