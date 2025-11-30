package com.Datium.Datium.dto;

public class InvitationSummaryResponse {
    private Long pendingReceived;
    private Long pendingSent;
    private Long accepted;
    private Long rejected;
    private Long expired;
    private Long total;

    public Long getPendingReceived() {
        return pendingReceived;
    }

    public void setPendingReceived(Long pendingReceived) {
        this.pendingReceived = pendingReceived;
    }

    public Long getPendingSent() {
        return pendingSent;
    }

    public void setPendingSent(Long pendingSent) {
        this.pendingSent = pendingSent;
    }

    public Long getAccepted() {
        return accepted;
    }

    public void setAccepted(Long accepted) {
        this.accepted = accepted;
    }

    public Long getRejected() {
        return rejected;
    }

    public void setRejected(Long rejected) {
        this.rejected = rejected;
    }

    public Long getExpired() {
        return expired;
    }

    public void setExpired(Long expired) {
        this.expired = expired;
    }

    public Long getTotal() {
        return total;
    }

    public void setTotal(Long total) {
        this.total = total;
    }
}

