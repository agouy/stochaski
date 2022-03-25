BLACK = (255, 255, 255)

class Skier:
    
    def __init__(self, x, y, speed):
        self.x = None
        self.y = None
        self.speed = None
    
    def move_to(self, new_x, new_y):
        self.x = new_x
        self.y = new_y


