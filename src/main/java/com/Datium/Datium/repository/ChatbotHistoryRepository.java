package com.Datium.Datium.repository;

import com.Datium.Datium.entity.ChatbotHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatbotHistoryRepository extends JpaRepository<ChatbotHistory, Integer> {
    List<ChatbotHistory> findByUserId(Integer userId);
    List<ChatbotHistory> findBySystemId(Integer systemId);
    void deleteBySystemId(Integer systemId);
}
