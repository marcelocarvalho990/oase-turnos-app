#!/usr/bin/env python3
"""
Shift scheduling solver using Google OR-Tools CP-SAT.
Reads problem JSON from stdin, writes solution JSON to stdout.
"""
import sys
import json
import calendar
from datetime import date, timedelta

try:
    from ortools.sat.python import cp_model
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False


def get_day_of_week(year: int, month: int, day: int) -> int:
    """Returns 0=Mon ... 6=Sun"""
    return date(year, month, day).weekday()


def is_weekend(year: int, month: int, day: int) -> bool:
    dow = get_day_of_week(year, month, day)
    return dow >= 5  # Sat=5, Sun=6


def get_day_type(year: int, month: int, day: int) -> str:
    dow = get_day_of_week(year, month, day)
    if dow == 5:
        return 'SATURDAY'
    if dow == 6:
        return 'SUNDAY'
    return 'WEEKDAY'


def solve_schedule(problem: dict) -> dict:
    if not ORTOOLS_AVAILABLE:
        return {"status": "ERROR", "message": "ortools not installed. Run: pip install ortools"}

    year = problem['year']
    month = problem['month']
    days_in_month = calendar.monthrange(year, month)[1]
    days = list(range(1, days_in_month + 1))

    employees = problem['employees']
    all_shift_types = problem['shiftTypes']
    coverage_rules = problem['coverageRules']

    # Only work shifts (not absences) are decision variables
    work_shifts = [s for s in all_shift_types if not s.get('isAbsence', False)]
    shift_codes = [s['code'] for s in work_shifts]
    shift_duration = {s['code']: s['durationMinutes'] for s in work_shifts}

    # Hard blocks per employee (dates where they cannot work)
    hard_blocks = {}  # emp_id -> set of day numbers
    for emp in employees:
        emp_id = emp['id']
        hard_blocks[emp_id] = set()
        for block_date in emp.get('hardBlocks', []):
            parts = block_date.split('-')
            if len(parts) == 3 and int(parts[0]) == year and int(parts[1]) == month:
                hard_blocks[emp_id].add(int(parts[2]))

    model = cp_model.CpModel()

    # x[e_idx][d][s] = 1 if employee e works shift s on day d
    x = {}
    for e_idx in range(len(employees)):
        x[e_idx] = {}
        for d in days:
            x[e_idx][d] = {}
            for s in shift_codes:
                x[e_idx][d][s] = model.new_bool_var(f'x_{e_idx}_{d}_{s}')

    # Constraint 1: At most one shift per day per employee
    for e_idx in range(len(employees)):
        for d in days:
            model.add_at_most_one(x[e_idx][d][s] for s in shift_codes)

    # Constraint 2: Hard blocks (absences, vacation, etc.)
    for e_idx, emp in enumerate(employees):
        for d in hard_blocks.get(emp['id'], set()):
            if d in days:
                for s in shift_codes:
                    model.add(x[e_idx][d][s] == 0)

    # Constraint 3: No late-then-early (S on day d → no F on day d+1)
    if 'S' in shift_codes and 'F' in shift_codes:
        for e_idx in range(len(employees)):
            for d in days[:-1]:
                model.add(x[e_idx][d]['S'] + x[e_idx][d+1]['F'] <= 1)

    # Constraint 4: Coverage minimums
    for rule in coverage_rules:
        shift = rule['shiftCode']
        if shift not in shift_codes:
            continue
        day_type_target = rule['dayType']
        min_staff = rule['minStaff']

        for d in days:
            dt = get_day_type(year, month, d)
            if dt == day_type_target:
                model.add(
                    sum(x[e_idx][d][shift] for e_idx in range(len(employees))) >= min_staff
                )

    # Constraint 5: Role eligibility
    for e_idx, emp in enumerate(employees):
        emp_role = emp.get('role', '')
        for d in days:
            for s_obj in work_shifts:
                s = s_obj['code']
                eligible_roles = s_obj.get('eligibleRoles', [])
                if eligible_roles and emp_role not in eligible_roles:
                    model.add(x[e_idx][d][s] == 0)

    # Soft constraint: target hours
    # Each employee has a target number of shifts based on work percentage
    # 42h/week, 8.4h/day. Target shifts ≈ (workPercentage/100) * working_days
    working_days_in_month = sum(
        1 for d in days if get_day_type(year, month, d) == 'WEEKDAY'
    )

    # Fairness: weekend distribution
    # Count weekends per employee and minimize the max-min difference
    weekend_days = [d for d in days if is_weekend(year, month, d)]

    weekends_per_employee = []
    for e_idx in range(len(employees)):
        if weekend_days:
            we_count = sum(
                x[e_idx][d][s]
                for d in weekend_days
                for s in shift_codes
            )
            weekends_per_employee.append(we_count)

    # Objective: minimize slack variables for target hours + weekend fairness
    objective_terms = []

    # Target hours penalty
    for e_idx, emp in enumerate(employees):
        work_pct = emp.get('workPercentage', 100) / 100.0
        target_shifts = int(round(work_pct * working_days_in_month))

        actual_shifts = sum(
            x[e_idx][d][s]
            for d in days
            for s in shift_codes
        )

        # Penalty for deviation from target
        over = model.new_int_var(0, len(days), f'over_{e_idx}')
        under = model.new_int_var(0, len(days), f'under_{e_idx}')
        model.add(actual_shifts - target_shifts == over - under)
        objective_terms.append(over)
        objective_terms.append(under)

    # Weekend fairness penalty
    if len(weekends_per_employee) >= 2:
        max_we = model.new_int_var(0, len(weekend_days), 'max_we')
        min_we = model.new_int_var(0, len(weekend_days), 'min_we')
        model.add_max_equality(max_we, weekends_per_employee)
        model.add_min_equality(min_we, weekends_per_employee)
        we_diff = model.new_int_var(0, len(weekend_days), 'we_diff')
        model.add(we_diff == max_we - min_we)
        objective_terms.append(we_diff * 2)  # weight weekends heavier

    if objective_terms:
        model.minimize(sum(objective_terms))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    solver.parameters.log_search_progress = False

    status = solver.solve(model)

    status_str = 'INFEASIBLE'
    assignments = []
    violations = []
    fairness = {}

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        status_str = 'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'

        for e_idx, emp in enumerate(employees):
            weekends_worked = 0
            hard_shifts = 0
            emp_assignments = []

            for d in days:
                for s in shift_codes:
                    if solver.value(x[e_idx][d][s]):
                        date_str = f"{year}-{month:02d}-{d:02d}"
                        assignments.append({
                            'employeeId': emp['id'],
                            'date': date_str,
                            'shiftCode': s,
                        })
                        if is_weekend(year, month, d):
                            weekends_worked += 1
                        if s in ('S', 'G'):
                            hard_shifts += 1
                        emp_assignments.append(s)

            fairness[emp['id']] = {
                'weekends': weekends_worked,
                'hardShifts': hard_shifts,
                'totalShifts': len(emp_assignments),
            }
    else:
        violations.append({
            'type': 'INFEASIBLE',
            'message': 'No feasible schedule found. Check coverage rules and staff availability.',
        })

    return {
        'status': status_str,
        'assignments': assignments,
        'violations': violations,
        'fairness': fairness,
        'durationMs': int(solver.wall_time * 1000),
        'objectiveValue': solver.objective_value if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else None,
    }


def main():
    try:
        problem = json.load(sys.stdin)
        result = solve_schedule(problem)
        print(json.dumps(result))
    except Exception as e:
        error = {
            'status': 'ERROR',
            'assignments': [],
            'violations': [{'type': 'ERROR', 'message': str(e)}],
            'fairness': {},
            'durationMs': 0,
        }
        print(json.dumps(error))
        sys.exit(1)


if __name__ == '__main__':
    main()
