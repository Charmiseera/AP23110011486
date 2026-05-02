# Notification System Design

## 1. API Design

### Endpoints:

**GET /notifications**

* Query params:

  * studentId
  * type (placement | result | event)
  * isRead (true/false)
  * limit (pagination)
* Returns filtered notifications sorted by priority and time.

**POST /notifications**

* Creates a new notification
* Validates input fields

**POST /notifications/read**

* Marks a notification as read using ID

**POST /notifications/notify-all**

* Sends notifications to multiple users asynchronously

---

## 2. Database Design

### Choice:

* Use NoSQL (MongoDB-like) for scalability and flexibility

### Schema:

```
Notification {
  id: string,
  studentId: number,
  type: string,
  message: string,
  isRead: boolean,
  createdAt: timestamp
}
```

### Indexing:

* Compound index on:

  * studentId
  * isRead
  * createdAt (DESC)

---

## 3. Query Optimization

### Problem:

Query on large dataset (millions of records) causes slow response.

### Solution:

* Use compound indexing (studentId + isRead + createdAt)
* Avoid SELECT *
* Use pagination (limit)
* Return only required fields

---

## 4. Performance Improvements

### Issues:

* Frequent DB calls overload system

### Solutions:

* Add caching layer (Redis / in-memory cache)
* Use pagination
* Push-based updates (WebSockets instead of polling)

---

## 5. notify_all System Improvement

### Problem:

* Sequential processing is slow
* No retry mechanism
* System tightly coupled

### Solution:

* Use queue system (Kafka / RabbitMQ)
* Push jobs to queue
* Process asynchronously
* Add retry mechanism (max 2 retries)
* Handle failures without crashing system

---

## 6. Priority Inbox

### Requirement:

* Important notifications should appear first

### Approach:

* Assign weights:

  * placement = 3
  * result = 2
  * event = 1

### Sorting:

* Sort by priority first
* Then by createdAt DESC

---

## 7. Scalability Considerations

* Use distributed caching (Redis)
* Use horizontal scaling for backend services
* Use load balancers
* Use message queues for async processing

---

## 8. Error Handling

* Use structured error responses:

```
{
  error: {
    code: string,
    message: string
  }
}
```

* Validate all inputs
* Handle failures gracefully

---

## Conclusion

The system is designed to be scalable, efficient, and fault-tolerant using caching, indexing, asynchronous processing, and clean API design.
