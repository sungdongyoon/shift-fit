import { Document, Font, Page, Text, View } from "@react-pdf/renderer";
import { assignmentColor, categories, labels } from "@/lib/schedule";
import type { SchedulePdfData } from "@/lib/schedule-pdf-data";
import { pdfColors, pdfStyles as styles } from "./schedule-pdf-styles";

const NON_WORK_CATEGORIES = ["off", "leave", "other", "unassigned"] as const;
const EMPLOYEES_PER_TABLE = 20;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export const registerSchedulePdfFonts = (basePath = "/fonts") => {
  Font.register({
    family: "ShiftfitKorean",
    fonts: [
      { src: `${basePath}/NanumGothic-Regular.ttf`, fontWeight: 400 },
      { src: `${basePath}/NanumGothic-Bold.ttf`, fontWeight: 700 },
    ],
  });
};

const LegendItem = ({ color, text }: { color: string; text: string }) => (
  <View style={styles.legendItem} wrap={false}>
    <View style={[styles.swatch, { backgroundColor: color }]} />
    <Text>{text}</Text>
  </View>
);

const ShiftLegend = ({ data }: { data: SchedulePdfData }) => (
  <View>
    <Text style={[styles.sectionTitle, styles.sectionTitleFlush]}>근무 타입</Text>
    <View style={styles.legend}>
      {data.shiftTypes.map((shift, index) => (
        <LegendItem
          key={index}
          color={shift.color}
          text={`${shift.name}  ${shift.start}-${shift.end}${shift.end < shift.start ? " (+1일)" : ""}`}
        />
      ))}
      {!data.shiftTypes.length && <Text>등록된 근무 타입 없음</Text>}
      {NON_WORK_CATEGORIES.map((category) => (
        <LegendItem
          key={category}
          color={assignmentColor({ category })}
          text={labels[category]}
        />
      ))}
    </View>
  </View>
);

const PdfCalendar = ({ data, calendar }: {
  data: SchedulePdfData;
  calendar: SchedulePdfData["calendars"][number];
}) => (
  <View style={styles.calendarSection} wrap={false}>
    <Text style={[styles.sectionTitle, styles.sectionTitleFlush]} minPresenceAhead={90}>
      {data.title}
      {data.calendars.length > 1
        ? ` (근무자 ${calendar.start}-${calendar.end})`
        : ""}
    </Text>
    <View style={styles.week} wrap={false}>
      {WEEKDAYS.map((day, column) => (
        <Text
          key={day}
          style={[
            styles.weekday,
            { color: column === 0 ? pdfColors.danger : pdfColors.ink },
          ]}
        >
          {day}
        </Text>
      ))}
    </View>
    {calendar.weeks.map((week) => (
      <View key={week[0].date} style={styles.week} wrap={false}>
        {week.map((day) => {
          const isRedDay = Boolean(day.holiday) || day.column === 0;
          let dateColor = pdfColors.ink;

          if (day.column === 6) dateColor = pdfColors.saturday;
          if (isRedDay) dateColor = pdfColors.danger;
          if (!day.isCurrentMonth) dateColor = pdfColors.muted;

          return (
            <View
              key={day.date}
              style={[
                styles.day,
                {
                  backgroundColor: day.isCurrentMonth
                    ? "#FFFFFF"
                    : pdfColors.subtle,
                },
              ]}
            >
              <View style={styles.dateHeader}>
                <Text style={[styles.date, { color: dateColor }]}>
                  {day.day}
                </Text>
                {day.isCurrentMonth && day.holiday && (
                  <Text style={styles.holiday}>{day.holiday}</Text>
                )}
              </View>
              {day.rows.map(({ employee, assignment }) => (
                <View
                  key={employee.id}
                  style={[
                    styles.assignment,
                    {
                      backgroundColor: `${assignmentColor(assignment)}13`,
                    },
                  ]}
                >
                  <View style={[styles.assignmentAccent, {
                    backgroundColor: assignmentColor(assignment),
                  }]} />
                  <Text
                    style={[
                      styles.assignmentName,
                      {
                        fontSize: Math.min(
                          6.5,
                          96 / Array.from(employee.name).length,
                        ),
                      },
                    ]}
                  >
                    {employee.name}{assignment.category === "unassigned" ? " · 미배정" : ""}
                    {assignment.category === "other" && assignment.memo
                      ? ` · ${assignment.memo.replace(/\s+/g, " ").trim()}`
                      : ""}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    ))}
  </View>
);

const PdfEmployeeList = ({ data }: { data: SchedulePdfData }) => {
  const groups = [];

  for (
    let index = 0;
    index < data.employees.length;
    index += EMPLOYEES_PER_TABLE
  ) {
    groups.push(data.employees.slice(index, index + EMPLOYEES_PER_TABLE));
  }

  return (
    <View>
      {groups.map((employees, index) => (
        <View key={employees[0].id} style={styles.employeeSection} wrap={false}>
          <Text style={[styles.sectionTitle, styles.sectionTitleFlush]}>
            근무자 명단 · 월별 횟수{index > 0 ? " (계속)" : ""}
          </Text>
          <Text style={styles.employeeSummary}>
            근무자 {data.employees.length}명 · 월 기준 휴무 {data.target}일
          </Text>
          <View style={styles.tableHeader}>
            <Text style={styles.employeeName}>이름</Text>
            {categories.map((category) => (
              <Text key={category} style={styles.count}>
                {labels[category]}
              </Text>
            ))}
          </View>
          {employees.map((employee) => (
            <View key={employee.id} style={styles.tableRow}>
              <Text style={styles.employeeName}>
                {employee.name}
              </Text>
              {categories.map((category) => (
                <Text
                  key={category}
                  style={[
                    styles.count,
                    {
                      color:
                        category === "off" &&
                          employee.counts.off !== data.target
                          ? pdfColors.danger
                          : pdfColors.ink,
                      fontWeight: category === "off" && employee.counts.off > data.target ? 600 : 400,
                    },
                  ]}
                >
                  {employee.counts[category]}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const PdfFooter = () => (
  <Text
    style={styles.footer}
    fixed
    render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
  />
);

export const SchedulePdf = ({ data }: { data: SchedulePdfData }) => (
  <Document title={data.title} author="Shiftfit" language="ko">
    {data.calendars.map((calendar, index) => (
      <Page key={calendar.start} size="A4" orientation="landscape" style={styles.page}>
        {index === 0 && (
          <>
            <Text style={styles.title}>{data.title}</Text>
            <ShiftLegend data={data} />
          </>
        )}
        <PdfCalendar data={data} calendar={calendar} />
        <PdfFooter />
      </Page>
    ))}
    <Page size="A4" orientation="landscape" style={styles.page}>
      <PdfEmployeeList data={data} />
      <PdfFooter />
    </Page>
  </Document>
);
