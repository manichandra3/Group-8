package com.example.trade_service.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(indexes = {
        @Index(name = "idx_candle_company_time", columnList = "companyId, startTime")
})
public class Candle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long companyId;

    private double open;
    private double high;
    private double low;
    private double close;

    // ← @JsonFormat makes Spring serialize as "2024-03-19T11:30:00"
    // instead of the default array [2024,3,19,11,30,0] which the frontend can't parse
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startTime;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endTime;

    private String interval;

    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public Long getCompanyId()                   { return companyId; }
    public void setCompanyId(Long companyId)     { this.companyId = companyId; }

    public double getOpen()                      { return open; }
    public void setOpen(double open)             { this.open = open; }

    public double getHigh()                      { return high; }
    public void setHigh(double high)             { this.high = high; }

    public double getLow()                       { return low; }
    public void setLow(double low)               { this.low = low; }

    public double getClose()                     { return close; }
    public void setClose(double close)           { this.close = close; }

    public LocalDateTime getStartTime()          { return startTime; }
    public void setStartTime(LocalDateTime t)    { this.startTime = t; }

    public LocalDateTime getEndTime()            { return endTime; }
    public void setEndTime(LocalDateTime t)      { this.endTime = t; }

    public String getInterval()                  { return interval; }
    public void setInterval(String interval)     { this.interval = interval; }
}