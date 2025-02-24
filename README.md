# Face Encoding test task

This service enables users to start a face encoding session and add up to five different photos, and get a session sumary.

Since we can assume that that customers are already authenticated and authorized to
interact with Veriff’s services. User identification will be achieved by passing a `user` header to each request.


## TODO
- [ ] Swagger integration
    - [ ] Upload photos
    - [ ] List sessions
- [ ] add userId middleware
- It should check if you sent the userId
